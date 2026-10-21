import { Court, Game, UserProfile, AppNotification, ChatMessage } from '../types';

export const CURRENT_USER: UserProfile = {
  id: 'user-current',
  name: 'Ahmed Al-Kandari',
  nameAr: 'أحمد الكندري',
  username: 'ahmed_kw',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  area: 'Kuwait City',
  bio: 'Sports enthusiast. Weekend striker & Padel addict. Always down for competitive yet friendly pickup games!',
  favoriteSports: ['Football', 'Padel', 'Volleyball'],
  skills: {
    Football: 'Intermediate',
    Padel: 'Advanced',
    Volleyball: 'Casual',
    Basketball: 'Casual',
  },
  gamesPlayed: 42,
  gamesHosted: 8,
  attendanceRate: 98,
  isOrganizer: true,
  age: 26,
  privacy: {
    showAge: true,
    showPhone: false,
    allowDirectInvites: true,
  },
};

export const MOCK_PLAYERS: UserProfile[] = [
  CURRENT_USER,
  {
    id: 'user-salem',
    name: 'Salem Al-Otaibi',
    nameAr: 'سالم العتيبي',
    username: 'salem_striker',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    area: 'Mishref',
    bio: 'Box-to-box midfielder. Let us keep it clean and energetic.',
    favoriteSports: ['Football', 'Basketball'],
    skills: { Football: 'Advanced', Basketball: 'Intermediate' },
    gamesPlayed: 64,
    gamesHosted: 15,
    attendanceRate: 100,
    isFollowing: true,
    privacy: { showAge: true, showPhone: false, allowDirectInvites: true }
  },
  {
    id: 'user-yousef',
    name: 'Yousef Al-Mutawa',
    nameAr: 'يوسف المطوع',
    username: 'yousef_padel',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    area: 'Shuwaikh',
    bio: 'Top spin lob master. Padel 4 life.',
    favoriteSports: ['Padel', 'Tennis'],
    skills: { Padel: 'Advanced', Tennis: 'Intermediate' },
    gamesPlayed: 89,
    gamesHosted: 22,
    attendanceRate: 99,
    isFollowing: true,
    privacy: { showAge: false, showPhone: false, allowDirectInvites: true }
  },
  {
    id: 'user-fahad',
    name: 'Fahad Al-Sabah',
    nameAr: 'فهد الصباح',
    username: 'fahad_keeper',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    area: 'Salmiya',
    bio: 'Goalkeeper ready to stop bullets. Call me for any late game.',
    favoriteSports: ['Football'],
    skills: { Football: 'Competitive' },
    gamesPlayed: 51,
    gamesHosted: 6,
    attendanceRate: 96,
    isFollowing: false,
    privacy: { showAge: true, showPhone: true, allowDirectInvites: true }
  },
  {
    id: 'user-noura',
    name: 'Noura Al-Hajri',
    nameAr: 'نورة الهاجري',
    username: 'noura_volleyball',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    area: 'Yarmouk',
    bio: 'Beach volleyball & padel enthusiast. Looking for positive vibes.',
    favoriteSports: ['Volleyball', 'Padel', 'Badminton'],
    skills: { Volleyball: 'Advanced', Padel: 'Intermediate' },
    gamesPlayed: 33,
    gamesHosted: 9,
    attendanceRate: 100,
    isFollowing: true,
    privacy: { showAge: true, showPhone: false, allowDirectInvites: true }
  },
  {
    id: 'user-bader',
    name: 'Bader Al-Enezi',
    nameAr: 'بدر العنزي',
    username: 'bader_hoops',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80',
    area: 'Hawalli',
    bio: 'Shooting guard. Casual 3v3 and 5v5 games.',
    favoriteSports: ['Basketball'],
    skills: { Basketball: 'Intermediate' },
    gamesPlayed: 28,
    gamesHosted: 4,
    attendanceRate: 94,
    isFollowing: false,
    privacy: { showAge: true, showPhone: false, allowDirectInvites: true }
  },
  {
    id: 'user-dana',
    name: 'Dana Al-Ghanim',
    nameAr: 'دانة الغانم',
    username: 'dana_padel_kw',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    area: 'Jabriya',
    bio: 'Padel tournament player. Level 3.5+. Love Sunday evening matches.',
    favoriteSports: ['Padel', 'Tennis'],
    skills: { Padel: 'Competitive', Tennis: 'Advanced' },
    gamesPlayed: 76,
    gamesHosted: 19,
    attendanceRate: 99,
    isFollowing: true,
    privacy: { showAge: false, showPhone: false, allowDirectInvites: true }
  }
];

export const MOCK_COURTS: Court[] = [
  {
    id: 'court-padelin-shuwaikh',
    name: 'Padel In - Shuwaikh Industrial',
    nameAr: 'بادل إن - الشويخ الصناعية',
    sport: 'Padel',
    area: 'Shuwaikh',
    address: 'Street 22, Block 1, Shuwaikh',
    rating: 4.9,
    reviewsCount: 142,
    pricePerHourKWD: 18.000,
    isIndoor: true,
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
    amenities: ['Air Conditioned', 'Showers & Lockers', 'Valet Parking', 'Pro Shop & Café', 'High-speed Wi-Fi'],
    coordinates: { x: 42, y: 38 },
    availableSlots: [
      { id: 's1', date: '2026-09-25', startTime: '18:00', endTime: '19:30', priceKWD: 20.000 },
      { id: 's2', date: '2026-09-25', startTime: '20:00', endTime: '21:30', priceKWD: 20.000 },
      { id: 's3', date: '2026-09-25', startTime: '22:00', endTime: '23:30', priceKWD: 18.000 },
      { id: 's4', date: '2026-09-26', startTime: '19:00', endTime: '20:30', priceKWD: 20.000 },
    ]
  },
  {
    id: 'court-mishref-stadium',
    name: 'Mishref Youth Center Stadium',
    nameAr: 'ملعب مركز شباب مشرف',
    sport: 'Football',
    area: 'Mishref',
    address: 'Block 6, Mishref Oasis Road',
    rating: 4.8,
    reviewsCount: 210,
    pricePerHourKWD: 15.000,
    isIndoor: false,
    image: 'https://images.unsplash.com/photo-1529900244933-289523cb0db0?auto=format&fit=crop&w=800&q=80',
    amenities: ['FIFA Grade Turf', 'Stadium Floodlights', 'Free Parking', 'Water Coolers', 'Changing Rooms'],
    coordinates: { x: 55, y: 52 },
    availableSlots: [
      { id: 'm1', date: '2026-09-25', startTime: '19:30', endTime: '21:00', priceKWD: 15.000 },
      { id: 'm2', date: '2026-09-25', startTime: '21:00', endTime: '22:30', priceKWD: 15.000 },
      { id: 'm3', date: '2026-09-26', startTime: '20:00', endTime: '21:30', priceKWD: 15.000 },
    ]
  },
  {
    id: 'court-salmiya-arena',
    name: 'Salmiya Sports Club Courts',
    nameAr: 'ملاعب نادي السالمية الرياضي',
    sport: 'Football',
    area: 'Salmiya',
    address: 'Khanasa Street, Block 12, Salmiya',
    rating: 4.7,
    reviewsCount: 188,
    pricePerHourKWD: 12.000,
    isIndoor: false,
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    amenities: ['Artificial Grass', 'Floodlights', 'Cafeteria', 'Restrooms'],
    coordinates: { x: 68, y: 44 },
    availableSlots: [
      { id: 'sa1', date: '2026-09-25', startTime: '20:00', endTime: '21:30', priceKWD: 12.000 },
      { id: 'sa2', date: '2026-09-25', startTime: '21:30', endTime: '23:00', priceKWD: 12.000 },
    ]
  },
  {
    id: 'court-yarmouk-padel',
    name: 'Yarmouk Club Premium Padel',
    nameAr: 'بادل نادي اليرموك النموذجي',
    sport: 'Padel',
    area: 'Yarmouk',
    address: 'Yarmouk Ring 4, Block 2',
    rating: 4.9,
    reviewsCount: 95,
    pricePerHourKWD: 16.000,
    isIndoor: true,
    image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80',
    amenities: ['Panoramic Glass', 'Full Climate Control', 'Specialty Coffee Bar', 'Locker Rooms'],
    coordinates: { x: 48, y: 48 },
    availableSlots: [
      { id: 'y1', date: '2026-09-25', startTime: '19:00', endTime: '20:30', priceKWD: 16.000 },
      { id: 'y2', date: '2026-09-26', startTime: '20:30', endTime: '22:00', priceKWD: 16.000 },
    ]
  },
  {
    id: 'court-the-village',
    name: 'The Village Basketball Court',
    nameAr: 'ملعب سلة ذا فيلج - أبو الحصانية',
    sport: 'Basketball',
    area: 'Abu Hasaniya',
    address: 'Fahaheel Expy, Abu Hasaniya Coastal',
    rating: 4.8,
    reviewsCount: 77,
    pricePerHourKWD: 10.000,
    isIndoor: true,
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
    amenities: ['Hardwood Flooring', 'Breakaway Rims', 'Electronic Scoreboard', 'Lounge Area'],
    coordinates: { x: 72, y: 70 },
    availableSlots: [
      { id: 'tv1', date: '2026-09-25', startTime: '19:00', endTime: '20:30', priceKWD: 10.000 },
      { id: 'tv2', date: '2026-09-26', startTime: '18:00', endTime: '19:30', priceKWD: 10.000 },
    ]
  },
  {
    id: 'court-marina-volleyball',
    name: 'Marina Beach Volleyball Arena',
    nameAr: 'ملاعب الكرة الطائرة - شاطئ مارينا',
    sport: 'Volleyball',
    area: 'Salmiya',
    address: 'Arabian Gulf Street, Marina Waves',
    rating: 4.6,
    reviewsCount: 64,
    pricePerHourKWD: 8.000,
    isIndoor: false,
    image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80',
    amenities: ['Deep White Sand', 'Sea Breeze', 'Night Lights', 'Beachside Showers'],
    coordinates: { x: 74, y: 40 },
    availableSlots: [
      { id: 'mv1', date: '2026-09-25', startTime: '18:30', endTime: '20:00', priceKWD: 8.000 },
      { id: 'mv2', date: '2026-09-26', startTime: '19:00', endTime: '20:30', priceKWD: 8.000 },
    ]
  }
];

export const INITIAL_GAMES: Game[] = [
  {
    id: 'game-friday-football',
    title: 'Friday Night Football ⚽',
    sport: 'Football',
    date: '2026-09-25',
    startTime: '20:00',
    endTime: '21:30',
    courtName: 'Mishref Youth Center Stadium',
    area: 'Mishref',
    address: 'Block 6, Mishref Oasis Road',
    coordinates: { x: 55, y: 52 },
    isIndoor: false,
    maxPlayers: 10,
    organizer: MOCK_PLAYERS[1], // Salem
    participants: [
      {
        userId: MOCK_PLAYERS[1].id,
        name: MOCK_PLAYERS[1].name,
        username: MOCK_PLAYERS[1].username,
        avatar: MOCK_PLAYERS[1].avatar,
        skill: 'Advanced',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.500,
        joinedAt: 'Yesterday',
        paymentMethod: 'KNET'
      },
      {
        userId: MOCK_PLAYERS[3].id, // Fahad
        name: MOCK_PLAYERS[3].name,
        username: MOCK_PLAYERS[3].username,
        avatar: MOCK_PLAYERS[3].avatar,
        skill: 'Competitive',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.500,
        joinedAt: 'Yesterday',
        paymentMethod: 'Apple Pay'
      },
      {
        userId: 'user-aux-1',
        name: 'Tariq Al-Bahar',
        username: 'tariq_kw',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.500,
        joinedAt: '3 hours ago',
        paymentMethod: 'KNET'
      },
      {
        userId: 'user-aux-2',
        name: 'Meshari Al-Zaid',
        username: 'meshari_7',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.500,
        joinedAt: '2 hours ago',
        paymentMethod: 'KNET'
      },
      {
        userId: 'user-aux-3',
        name: 'Hamad Al-Roumi',
        username: 'hamad_r',
        avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=300&q=80',
        skill: 'Casual',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.500,
        joinedAt: '1 hour ago',
        paymentMethod: 'Credit Card'
      },
      {
        userId: 'user-aux-4',
        name: 'Nawaf Al-Ajmi',
        username: 'nawaf_mid',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.500,
        joinedAt: '40 mins ago',
        paymentMethod: 'KNET'
      },
      {
        userId: 'user-aux-5',
        name: 'Khaled Al-Shatti',
        username: 'khaled_sh',
        avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=300&q=80',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.500,
        joinedAt: '15 mins ago',
        paymentMethod: 'Apple Pay'
      }
    ],
    totalCourtCostKWD: 15.000,
    pricePerPlayerKWD: 1.500,
    costSharing: {
      enabled: true,
      method: 'cash',
      estimatedShare: 1.500,
      currency: 'KWD'
    },
    skillLevel: 'Intermediate',
    gender: 'Everyone',
    visibility: 'Public',
    status: 'Almost Full',
    description: 'Casual 5v5 game under the stadium lights. Good tempo, friendly vibes. Bibs & water provided. Please arrive 15 minutes before kick-off!',
    createdAt: '2026-09-24T10:00:00Z',
    cancellationPolicy: 'Free cancellation up to 4 hours before kickoff.'
  },
  {
    id: 'game-padel-doubles',
    title: 'Padel In 2v2 Smash Battle 🎾',
    sport: 'Padel',
    date: '2026-09-25',
    startTime: '20:00',
    endTime: '21:30',
    courtName: 'Padel In - Shuwaikh Industrial',
    area: 'Shuwaikh',
    address: 'Street 22, Block 1, Shuwaikh',
    coordinates: { x: 42, y: 38 },
    isIndoor: true,
    maxPlayers: 4,
    organizer: CURRENT_USER,
    participants: [
      {
        userId: CURRENT_USER.id,
        name: CURRENT_USER.name,
        username: CURRENT_USER.username,
        avatar: CURRENT_USER.avatar,
        skill: 'Advanced',
        paymentStatus: 'Paid',
        paidAmountKWD: 5.000,
        joinedAt: 'Yesterday',
        paymentMethod: 'KNET'
      },
      {
        userId: MOCK_PLAYERS[2].id, // Yousef
        name: MOCK_PLAYERS[2].name,
        username: MOCK_PLAYERS[2].username,
        avatar: MOCK_PLAYERS[2].avatar,
        skill: 'Advanced',
        paymentStatus: 'Paid',
        paidAmountKWD: 5.000,
        joinedAt: '3 hours ago',
        paymentMethod: 'KNET'
      },
      {
        userId: MOCK_PLAYERS[6].id, // Dana
        name: MOCK_PLAYERS[6].name,
        username: MOCK_PLAYERS[6].username,
        avatar: MOCK_PLAYERS[6].avatar,
        skill: 'Competitive',
        paymentStatus: 'Paid',
        paidAmountKWD: 5.000,
        joinedAt: '1 hour ago',
        paymentMethod: 'Apple Pay'
      }
    ],
    totalCourtCostKWD: 20.000,
    pricePerPlayerKWD: 5.000,
    costSharing: {
      enabled: true,
      method: 'request_link',
      estimatedShare: 5.000,
      currency: 'KWD'
    },
    skillLevel: 'Advanced',
    gender: 'Everyone',
    visibility: 'Public',
    status: 'Almost Full',
    description: 'Looking for our 4th player! Fast-paced rallies, level 3.5+ players. Fresh can of Bullpadel balls included.',
    createdAt: '2026-09-24T14:30:00Z',
    cancellationPolicy: 'Cancellations 6 hours before kickoff.'
  },
  {
    id: 'game-salmiya-derby',
    title: 'Salmiya Weekend 6v6 Football',
    sport: 'Football',
    date: '2026-09-26',
    startTime: '20:00',
    endTime: '21:30',
    courtName: 'Salmiya Sports Club Courts',
    area: 'Salmiya',
    address: 'Khanasa Street, Block 12, Salmiya',
    coordinates: { x: 68, y: 44 },
    isIndoor: false,
    maxPlayers: 12,
    organizer: MOCK_PLAYERS[3],
    participants: [
      {
        userId: MOCK_PLAYERS[3].id,
        name: MOCK_PLAYERS[3].name,
        username: MOCK_PLAYERS[3].username,
        avatar: MOCK_PLAYERS[3].avatar,
        skill: 'Competitive',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.000,
        joinedAt: '2 days ago',
        paymentMethod: 'KNET'
      },
      {
        userId: 'p-101',
        name: 'Ali Al-Husseini',
        username: 'ali_h',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.000,
        joinedAt: '1 day ago',
        paymentMethod: 'KNET'
      }
    ],
    totalCourtCostKWD: 12.000,
    pricePerPlayerKWD: 1.000,
    costSharing: {
      enabled: true,
      method: 'wamd',
      estimatedShare: 1.000,
      currency: 'KWD'
    },
    skillLevel: 'Casual',
    gender: 'Everyone',
    visibility: 'Public',
    status: 'Open',
    description: 'Friendly 6v6 on the classic Salmiya turf. Good run to blow off steam. Goalkeepers get free bottled water!',
    createdAt: '2026-09-23T11:00:00Z',
    cancellationPolicy: 'Standard cancellation policy.'
  },
  {
    id: 'game-village-hoops',
    title: 'The Village 4v4 Pickup Hoops 🏀',
    sport: 'Basketball',
    date: '2026-09-25',
    startTime: '19:00',
    endTime: '20:30',
    courtName: 'The Village Basketball Court',
    area: 'Abu Hasaniya',
    address: 'Fahaheel Expy, Abu Hasaniya Coastal',
    coordinates: { x: 72, y: 70 },
    isIndoor: true,
    maxPlayers: 8,
    organizer: MOCK_PLAYERS[5], // Bader
    participants: [
      {
        userId: MOCK_PLAYERS[5].id,
        name: MOCK_PLAYERS[5].name,
        username: MOCK_PLAYERS[5].username,
        avatar: MOCK_PLAYERS[5].avatar,
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.250,
        joinedAt: 'Yesterday',
        paymentMethod: 'KNET'
      },
      {
        userId: 'p-102',
        name: 'Saad Al-Fadhel',
        username: 'saad_bball',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
        skill: 'Casual',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.250,
        joinedAt: 'Yesterday',
        paymentMethod: 'Apple Pay'
      },
      {
        userId: 'p-103',
        name: 'Jaber Al-Sabah',
        username: 'jaber_s',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.250,
        joinedAt: 'Today',
        paymentMethod: 'KNET'
      }
    ],
    totalCourtCostKWD: 10.000,
    pricePerPlayerKWD: 0,
    costSharing: {
      enabled: false
    },
    skillLevel: 'Intermediate',
    gender: 'Everyone',
    visibility: 'Public',
    status: 'Open',
    description: 'Indoor AC full hardwood floor court. Call your own fouls. Winner stays on for best of 3 games to 15.',
    createdAt: '2026-09-24T09:00:00Z',
    cancellationPolicy: 'Full refund 2 hours before game.'
  },
  {
    id: 'game-beach-volleyball',
    title: 'Sunset Beach Volleyball 🏐',
    sport: 'Volleyball',
    date: '2026-09-25',
    startTime: '18:30',
    endTime: '20:00',
    courtName: 'Marina Beach Volleyball Arena',
    area: 'Salmiya',
    address: 'Arabian Gulf Street, Marina Waves',
    coordinates: { x: 74, y: 40 },
    isIndoor: false,
    maxPlayers: 8,
    organizer: MOCK_PLAYERS[4], // Noura
    participants: [
      {
        userId: MOCK_PLAYERS[4].id,
        name: MOCK_PLAYERS[4].name,
        username: MOCK_PLAYERS[4].username,
        avatar: MOCK_PLAYERS[4].avatar,
        skill: 'Advanced',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.000,
        joinedAt: 'Yesterday',
        paymentMethod: 'KNET'
      },
      {
        userId: 'p-104',
        name: 'Reem Al-Bisher',
        username: 'reem_volley',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.000,
        joinedAt: 'Yesterday',
        paymentMethod: 'Apple Pay'
      },
      {
        userId: 'p-105',
        name: 'Abdullah Al-Dosari',
        username: 'dossary_a',
        avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80',
        skill: 'Casual',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.000,
        joinedAt: '6 hours ago',
        paymentMethod: 'KNET'
      },
      {
        userId: 'p-106',
        name: 'Sarah Al-Kulaib',
        username: 'sarah_k',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 1.000,
        joinedAt: '4 hours ago',
        paymentMethod: 'Credit Card'
      }
    ],
    totalCourtCostKWD: 8.000,
    pricePerPlayerKWD: 1.000,
    costSharing: {
      enabled: true,
      method: 'request_link',
      estimatedShare: 1.000,
      currency: 'KWD'
    },
    skillLevel: 'Intermediate',
    gender: 'Everyone',
    visibility: 'Public',
    status: 'Open',
    description: 'Fun 4v4 sunset beach volleyball by Marina Waves. Great weather expected, bring sunglasses or a cap!',
    createdAt: '2026-09-23T15:00:00Z',
    cancellationPolicy: 'Cancellation up to 3 hours prior.'
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'joined',
    title: 'Spot Confirmed',
    titleAr: 'تم تأكيد حجز مقعدك',
    message: 'Dana Al-Ghanim joined your game "Padel In 2v2 Smash Battle".',
    messageAr: 'انضمت دانة الغانم إلى مباراتك "بادل إن ٢ ضد ٢".',
    timestamp: '1 hour ago',
    read: false,
    gameId: 'game-padel-doubles'
  },
  {
    id: 'notif-2',
    type: 'invite',
    title: 'Game Invitation',
    titleAr: 'دعوة لمباراة جديدة',
    message: 'Salem Al-Otaibi invited you to join "Friday Night Football" at Mishref Youth Center.',
    messageAr: 'دعاك سالم العتيبي للانضمام إلى "مباراة الجمعة لكرة القدم" في مركز شباب مشرف.',
    timestamp: '2 hours ago',
    read: false,
    gameId: 'game-friday-football'
  },
  {
    id: 'notif-3',
    type: 'reminder',
    title: 'Match Reminder ⏳',
    titleAr: 'تذكير بموعد المباراة ⏳',
    message: 'Your football game starts in 2 hours at Mishref Stadium. Have your boots ready!',
    messageAr: 'تبدأ مباراة كرة القدم خلال ساعتين في ملعب مشرف. جهز حذاءك وملابسك الرياضية!',
    timestamp: '3 hours ago',
    read: true,
    gameId: 'game-friday-football'
  },
  {
    id: 'notif-4',
    type: 'booking',
    title: 'Li3ib Court Confirmed',
    titleAr: 'تم تأكيد حجز الملعب عبر Li3ib',
    message: 'Your booking at Padel In - Shuwaikh is confirmed. Booking Ref: #LIB-98421.',
    messageAr: 'تم تأكيد حجزك في بادل إن - الشويخ بنجاح. رقم الحجز: #LIB-98421.',
    timestamp: 'Yesterday',
    read: true
  }
];

export const INITIAL_CHATS: Record<string, ChatMessage[]> = {
  'game-friday-football': [
    {
      id: 'chat-1',
      gameId: 'game-friday-football',
      senderId: 'user-salem',
      senderName: 'Salem Al-Otaibi (Organizer)',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      text: 'Salam guys! Please arrive 15 minutes early at Gate 3 so we can distribute the bibs (Whites vs Blacks).',
      timestamp: '14:20',
      isAnnouncement: true
    },
    {
      id: 'chat-2',
      gameId: 'game-friday-football',
      senderId: 'user-fahad',
      senderName: 'Fahad Al-Sabah',
      senderAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
      text: 'I am bringing the keeper gloves and 2 match balls. Is parking crowded on Friday?',
      timestamp: '15:05'
    },
    {
      id: 'chat-3',
      gameId: 'game-friday-football',
      senderId: 'user-salem',
      senderName: 'Salem Al-Otaibi',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      text: 'Plenty of parking by the main roundabout next to the mosque. See you there!',
      timestamp: '15:10'
    }
  ],
  'game-padel-doubles': [
    {
      id: 'chat-p1',
      gameId: 'game-padel-doubles',
      senderId: 'user-current',
      senderName: 'Ahmed Al-Kandari (Organizer)',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      text: 'Welcome Dana! Just need 1 more player to complete the 4-player match.',
      timestamp: '16:00',
      isAnnouncement: true
    },
    {
      id: 'chat-p2',
      gameId: 'game-padel-doubles',
      senderId: 'user-dana',
      senderName: 'Dana Al-Ghanim',
      senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      text: 'Excited! I will bring fresh Bullpadel Pro balls. Indoor court 2 right?',
      timestamp: '16:05'
    }
  ]
};
