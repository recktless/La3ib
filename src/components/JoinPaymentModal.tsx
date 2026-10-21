import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export const JoinPaymentModal: React.FC = () => {
  const { selectedGameForJoin, setSelectedGameForJoin, joinGame } = useApp();

  useEffect(() => {
    if (selectedGameForJoin) {
      // Direct join without obsolete payment UI
      joinGame(selectedGameForJoin.id).catch(console.error);
      setSelectedGameForJoin(null);
    }
  }, [selectedGameForJoin, joinGame, setSelectedGameForJoin]);

  return null;
};
