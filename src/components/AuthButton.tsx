'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignIn = async () => {
    const email = prompt('E-Mail Adresse eingeben:');
    if (!email) return;
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      alert('Fehler beim Anmelden: ' + error.message);
    } else {
      alert('Magic Link wurde an deine E-Mail gesendet! 📧');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Lädt...</div>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-700">
          👋 {user.email}
        </span>
        <button
          onClick={handleSignOut}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Abmelden
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
    >
      📧 Mit Magic Link anmelden
    </button>
  );
}