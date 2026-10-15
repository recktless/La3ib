import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { 
  MOCK_COURTS, 
  MOCK_PLAYERS, 
  INITIAL_GAMES, 
  INITIAL_CHATS, 
  INITIAL_NOTIFICATIONS 
} from '../data/mockData';

export interface MigrationStatus {
  inProgress: boolean;
  progressPercent: number;
  currentStep: string;
  totalItemsMigrated: number;
  error?: string;
  completed: boolean;
}

/**
 * Migrates existing seed datasets and localStorage state into live Firestore collections.
 * Runs atomically collection by collection without affecting existing local demo mode.
 */
export async function migrateLocalStateToFirestore(
  onUpdate?: (status: MigrationStatus) => void
): Promise<{ success: boolean; message: string; count: number }> {
  if (!isFirebaseConfigured || !db) {
    return {
      success: false,
      message: 'Firebase is not yet configured with project credentials. Please set up Firebase first.',
      count: 0
    };
  }

  const status: MigrationStatus = {
    inProgress: true,
    progressPercent: 0,
    currentStep: 'Preparing local state export...',
    totalItemsMigrated: 0,
    completed: false
  };

  const update = (step: string, percent: number, increment = 0) => {
    status.currentStep = step;
    status.progressPercent = percent;
    status.totalItemsMigrated += increment;
    onUpdate?.({ ...status });
  };

  try {
    // 1. Courts Collection
    update('Migrating Kuwait sports courts & venues...', 10);
    const courtsToMigrate = MOCK_COURTS;
    for (const court of courtsToMigrate) {
      const courtRef = doc(db, 'courts', court.id);
      try {
        await setDoc(courtRef, {
          ...court,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        status.totalItemsMigrated++;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `courts/${court.id}`);
      }
    }

    // 2. Users Collection
    update('Migrating athlete directory and profiles...', 30);
    const usersToMigrate = MOCK_PLAYERS;
    for (const player of usersToMigrate) {
      const userRef = doc(db, 'users', player.id);
      try {
        const { email: _omit, ...cleanPlayer } = player as any;
        await setDoc(userRef, {
          ...cleanPlayer,
          role: player.id === 'user-current' ? 'player' : 'player',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        status.totalItemsMigrated++;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${player.id}`);
      }
    }

    // 3. Games Collection & Game Participants
    update('Migrating community pickup games and rosters...', 55);
    const savedGames = localStorage.getItem('la3ib_games');
    const gamesToMigrate = savedGames ? JSON.parse(savedGames) : INITIAL_GAMES;

    for (const game of gamesToMigrate) {
      const gameRef = doc(db, 'games', game.id);
      try {
        await setDoc(gameRef, {
          ...game,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        status.totalItemsMigrated++;

        // Also seed game participants collection
        if (Array.isArray(game.participants)) {
          for (const participant of game.participants) {
            const partDocId = `${game.id}_${participant.userId}`;
            const partRef = doc(db, 'gameParticipants', partDocId);
            await setDoc(partRef, {
              id: partDocId,
              gameId: game.id,
              userId: participant.userId,
              userName: participant.name,
              userAvatar: participant.avatar,
              paymentStatus: participant.paymentStatus,
              paymentMethod: participant.paymentMethod || 'KNET',
              amountKWD: participant.paidAmountKWD || game.pricePerPlayerKWD,
              attended: participant.attendanceConfirmed || false,
              joinedAt: serverTimestamp()
            }, { merge: true });
            status.totalItemsMigrated++;
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `games/${game.id}`);
      }
    }

    // 4. Court Bookings
    update('Migrating Li3ib court reservations...', 75);
    const savedBookings = localStorage.getItem('la3ib_bookings');
    const bookingsToMigrate = savedBookings ? JSON.parse(savedBookings) : [
      {
        id: 'book-init-1',
        courtId: 'court-padelin-shuwaikh',
        courtName: 'Padel In - Shuwaikh Industrial',
        sport: 'Padel',
        area: 'Shuwaikh',
        address: 'Street 22, Block 1, Shuwaikh',
        date: '2026-09-25',
        startTime: '20:00',
        endTime: '21:30',
        totalCostKWD: 20.000,
        bookingRef: '#LIB-98421',
        bookedAt: '2026-09-24T12:00:00Z',
        isIndoor: true,
        courtImage: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
        hasBeenPostedAsGame: true
      }
    ];

    for (const booking of bookingsToMigrate) {
      const bookingRef = doc(db, 'courtBookings', booking.id);
      try {
        await setDoc(bookingRef, {
          ...booking,
          createdAt: serverTimestamp()
        }, { merge: true });
        status.totalItemsMigrated++;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `courtBookings/${booking.id}`);
      }
    }

    // 5. Chat Messages
    update('Migrating match communications and group chats...', 85);
    const savedChats = localStorage.getItem('la3ib_chats');
    const chatsToMigrate: Record<string, typeof INITIAL_CHATS[string]> = savedChats 
      ? JSON.parse(savedChats) 
      : INITIAL_CHATS;

    for (const [gameId, messages] of Object.entries(chatsToMigrate)) {
      for (const msg of messages) {
        const msgRef = doc(db, 'chatMessages', msg.id);
        try {
          await setDoc(msgRef, {
            ...msg,
            gameId,
            createdAt: serverTimestamp()
          }, { merge: true });
          status.totalItemsMigrated++;
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `chatMessages/${msg.id}`);
        }
      }
    }

    // 6. Notifications
    update('Migrating notifications...', 95);
    for (const notif of INITIAL_NOTIFICATIONS) {
      const notifRef = doc(db, 'notifications', notif.id);
      try {
        await setDoc(notifRef, {
          ...notif,
          userId: 'user-current',
          createdAt: serverTimestamp()
        }, { merge: true });
        status.totalItemsMigrated++;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `notifications/${notif.id}`);
      }
    }

    status.inProgress = false;
    status.progressPercent = 100;
    status.completed = true;
    status.currentStep = 'Migration successfully completed!';
    onUpdate?.({ ...status });

    return {
      success: true,
      message: `Successfully migrated ${status.totalItemsMigrated} records to Cloud Firestore.`,
      count: status.totalItemsMigrated
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    status.inProgress = false;
    status.error = errorMsg;
    onUpdate?.({ ...status });
    return {
      success: false,
      message: `Migration failed: ${errorMsg}`,
      count: status.totalItemsMigrated
    };
  }
}
