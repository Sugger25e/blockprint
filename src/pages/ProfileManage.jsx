import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ManageEdit from './ManageEdit';
import NotFound from './NotFound';

export default function ProfileManage() {
  const { userid } = useParams();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <div className="page"><p className="muted">Loading…</p></div>;

  // Admin always allowed
  if (user?.isAdmin) return <ManageEdit ownerMode={false} />;

  // Owner: compare discordId
  if (user && String(user.discordId) === String(userid)) {
    return <ManageEdit ownerMode={true} />;
  }

  // otherwise hide
  return <NotFound />;
}
