import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  auth,
  isFirebaseConfigured,
} from '../utils/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
  User,
} from 'firebase/auth';

/**
 * Guest profile stored in AsyncStorage
 */
interface GuestProfile {
  name: string;
  avatarIndex: number;
}

/**
 * Auth store state and actions
 */
interface AuthState {
  // State
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  guestProfile: GuestProfile | null;

  // Actions
  signInWithGoogle: (idToken: string, accessToken: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: (name: string, avatarIndex: number) => Promise<void>;
  loadGuestProfile: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

const GUEST_STORAGE_KEY = '@flippit/guest_profile';

/**
 * Zustand auth store with persistence for guest mode
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isGuest: false,
      isLoading: true,
      guestProfile: null,

      // Actions
      setUser: (user) => {
        set({ user, isGuest: false });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      signInWithGoogle: async (idToken: string, accessToken: string) => {
        if (!isFirebaseConfigured()) {
          throw new Error('Firebase not configured');
        }

        try {
          const credential = GoogleAuthProvider.credential(idToken, accessToken);
          const result = await signInWithCredential(auth, credential);
          set({ user: result.user, isGuest: false, guestProfile: null });

          // Clear guest profile on successful auth
          await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
        } catch (error) {
          console.error('Google sign-in error:', error);
          throw error;
        }
      },

      signInWithEmail: async (email: string, password: string) => {
        if (!isFirebaseConfigured()) {
          throw new Error('Firebase not configured');
        }

        try {
          const result = await signInWithEmailAndPassword(auth, email, password);
          set({ user: result.user, isGuest: false, guestProfile: null });

          // Clear guest profile on successful auth
          await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
        } catch (error) {
          console.error('Email sign-in error:', error);
          throw error;
        }
      },

      signUpWithEmail: async (email: string, password: string) => {
        if (!isFirebaseConfigured()) {
          throw new Error('Firebase not configured');
        }

        try {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          set({ user: result.user, isGuest: false, guestProfile: null });

          // Clear guest profile on successful auth
          await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
        } catch (error) {
          console.error('Email sign-up error:', error);
          throw error;
        }
      },

      signOut: async () => {
        if (!isFirebaseConfigured()) {
          set({ user: null, isGuest: false, guestProfile: null });
          return;
        }

        try {
          await firebaseSignOut(auth);
          set({ user: null, isGuest: false, guestProfile: null });

          // Clear guest profile on sign out
          await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
        } catch (error) {
          console.error('Sign out error:', error);
          throw error;
        }
      },

      continueAsGuest: async (name: string, avatarIndex: number) => {
        const profile: GuestProfile = { name, avatarIndex };

        // Store guest profile in AsyncStorage
        await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));

        set({
          user: null,
          isGuest: true,
          guestProfile: profile,
        });
      },

      loadGuestProfile: async () => {
        try {
          const stored = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
          if (stored) {
            const profile: GuestProfile = JSON.parse(stored);
            set({ guestProfile: profile, isGuest: true });
          }
        } catch (error) {
          console.error('Error loading guest profile:', error);
        }
      },
    }),
    {
      name: 'flippit-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isGuest: state.isGuest,
        guestProfile: state.guestProfile,
      }),
    }
  )
);

export default useAuthStore;
