import { doc, getDoc } from 'firebase/firestore';
import { auth, db, checkRateLimit, formatSecurityError } from '../config/firebase';
import { logger } from '../utils/logger';

export class SecurityService {
  // Validate user authentication for any operation
  static validateAuth(): { isValid: boolean; userId?: string; error?: any } {
    const user = auth.currentUser;
    
    if (!user) {
      logger.warn('Unauthorized access attempt - no authenticated user');
      return { 
        isValid: false, 
        error: formatSecurityError('authentication') 
      };
    }

    return { isValid: true, userId: user.uid };
  }

  // Check if user is blocked by another user
  static async isUserBlocked(currentUserId: string, targetUserId: string): Promise<boolean> {
    try {
      const blockedDoc = await getDoc(doc(db, 'users', targetUserId, 'blockedUsers', currentUserId));
      return blockedDoc.exists();
    } catch (error) {
      logger.error('Error checking blocked status:', error);
      return false; // Fail safe - allow interaction if we can't check
    }
  }

  // Validate chat access according to Firestore rules
  static async validateChatAccess(chatId: string, currentUserId: string): Promise<boolean> {
    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      
      if (!chatDoc.exists()) {
        return false;
      }

      const chatData = chatDoc.data();
      // This mirrors the Firestore rule: request.auth.uid in resource.data.users
      return chatData.users && chatData.users.includes(currentUserId);
    } catch (error) {
      logger.error('Error validating chat access:', error);
      return false;
    }
  }

  // Rate limiting for different actions
  static checkActionRateLimit(action: string): boolean {
    switch (action) {
      case 'message':
        return checkRateLimit('message', 5, 60000); // 5 messages per minute
      case 'follow':
        return checkRateLimit('follow', 2, 60000); // 2 follows per minute
      case 'like':
        return checkRateLimit('like', 10, 60000); // 10 likes per minute
      case 'post':
        return checkRateLimit('post', 5, 3600000); // 5 posts per hour
      case 'comment':
        return checkRateLimit('comment', 20, 60000); // 20 comments per minute
      default:
        return checkRateLimit('general', 100, 86400000); // 100 general actions per day
    }
  }

  // Log suspicious activity
  static logSuspiciousActivity(userId: string, action: string, details?: any) {
    logger.warn('Suspicious activity detected', {
      userId,
      action,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      details
    });
    
    // Store in localStorage for later analysis
    const suspiciousLogs = JSON.parse(localStorage.getItem('suspicious_logs') || '[]');
    suspiciousLogs.push({
      userId,
      action,
      timestamp: Date.now(),
      details
    });
    
    // Keep only last 100 logs
    if (suspiciousLogs.length > 100) {
      suspiciousLogs.splice(0, suspiciousLogs.length - 100);
    }
    
    localStorage.setItem('suspicious_logs', JSON.stringify(suspiciousLogs));
  }

  // Validate private account access
  static async validatePrivateAccountAccess(
    currentUserId: string, 
    targetUserId: string
  ): Promise<boolean> {
    try {
      // Check if target user is private
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      if (!userDoc.exists()) return false;

      const userData = userDoc.data();
      if (!userData.isPrivate) return true; // Public account

      // Check if current user is following the private account
      const followDoc = await getDoc(doc(db, 'users', targetUserId, 'followers', currentUserId));
      return followDoc.exists();
    } catch (error) {
      logger.error('Error validating private account access:', error);
      return false;
    }
  }
}
