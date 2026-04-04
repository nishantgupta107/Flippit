import { useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../utils/firebase';
import { useAuthStore } from '../store/authStore';

/**
 * Hook that provides auth state and actions
 * Automatically listens to Firebase auth state changes
 */
export function useAuth() {
  const {
    user,
    isGuest,
    isLoading,
    guestProfile,
    setUser,
    setLoading,
    loadGuestProfile,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    continueAsGuest,
  } = useAuthStore();

  // Listen to Firebase auth state
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      loadGuestProfile();
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser: User | null) => {
        setUser(firebaseUser);
        setLoading(false);

        // If no Firebase user, try to load guest profile
        if (!firebaseUser) {
          loadGuestProfile();
        }
      },
      (error) => {
        console.error('Auth state error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [setUser, setLoading, loadGuestProfile]);

  /**
   * Get the display name (Firebase user displayName, guest name, or 'Guest')
   */
  const getDisplayName = (): string => {
    if (user?.displayName) {
      return user.displayName;
    }
    if (guestProfile?.name) {
      return guestProfile.name;
    }
    return 'Guest';
  };

  /**
   * Get the user's unique identifier
   */
  const getUserId = (): string | null => {
    if (user?.uid) {
      return user.uid;
    }
    if (isGuest && guestProfile) {
      return `guest-${guestProfile.name}`;
    }
    return null;
  };

  /**
   * Check if user is authenticated (either Firebase or guest)
   */
  const isAuthenticated = Boolean(user) || (isGuest && guestProfile !== null);

  return {
    // State
    user,
    isGuest,
    isLoading,
    isAuthenticated,
    guestProfile,

    // Helpers
    getDisplayName,
    getUserId,

    // Actions
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    continueAsGuest,
  };
}

export default useAuth;
