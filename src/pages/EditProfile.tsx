
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import EditProfileHeader from '../components/profile/edit/EditProfileHeader';
import ProfileFormFields from '../components/profile/edit/ProfileFormFields';
import { useProfileEdit } from '../hooks/useProfileEdit';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const EditProfile = () => {
  const navigate = useNavigate();
  const {
    username,
    name,
    bio,
    externalLink,
    profileImage,
    loading,
    saving,
    usernameError,
    linkError,
    hasChanges,
    hasErrors,
    displayAvatar,
    setName,
    setBio,
    handleUsernameChange,
    handleExternalLinkChange,
    handleSave
  } = useProfileEdit();

  const onSave = async () => {
    const success = await handleSave();
    if (success) {
      navigate('/profile');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <EditProfileHeader
        hasChanges={hasChanges}
        saving={saving}
        hasErrors={hasErrors}
        onSave={onSave}
      />

      {/* Content */}
      <div className="p-6 max-w-md mx-auto">
        {/* Profile Photo - Read Only */}
        <div className="flex flex-col items-center mb-8">
          <Avatar className="w-24 h-24 mb-4">
            <AvatarImage src={displayAvatar} alt={username} />
            <AvatarFallback className="text-2xl">{username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">Profile photo editing coming soon</p>
        </div>

        {/* Form Fields */}
        <ProfileFormFields
          username={username}
          name={name}
          bio={bio}
          externalLink={externalLink}
          usernameError={usernameError}
          linkError={linkError}
          onUsernameChange={handleUsernameChange}
          onNameChange={setName}
          onBioChange={setBio}
          onExternalLinkChange={handleExternalLinkChange}
        />
      </div>
    </Layout>
  );
};

export default EditProfile;
