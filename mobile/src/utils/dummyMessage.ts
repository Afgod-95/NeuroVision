import { Message } from "@/src/components/messages/RecentMessages";

// Helper function to create dates relative to now
const createDate = (minutesAgo: number): Date => {
  const now = new Date();
  return new Date(now.getTime() - (minutesAgo * 60 * 1000));
};

export const dummyMessages: Message[] = [
  {
    id: '1',
    content: 'How do I implement authentication in React Native with Firebase?',
    timestamp: createDate(5), // 5 minutes ago
  },
  {
    id: '2',
    content: 'Can you help me debug this TypeScript error I\'m getting?',
    timestamp: createDate(45), // 45 minutes ago
  },
  {
    id: '3',
    content: 'What are the best practices for state management in large React applications?',
    timestamp: createDate(120), // 2 hours ago
  },
  {
    id: '4',
    content: 'Explain the difference between useEffect and useLayoutEffect',
    timestamp: createDate(360), // 6 hours ago
  },
  {
    id: '5',
    content: 'How to optimize FlatList performance for large datasets?',
    timestamp: createDate(720), // 12 hours ago
  },
  {
    id: '6',
    content: 'I need help with React Navigation v6 nested navigators',
    timestamp: createDate(1440), // 1 day ago
  },
  {
    id: '7',
    content: 'What\'s the best way to handle API calls in React Native?',
    timestamp: createDate(2160), // 1.5 days ago
  },
  {
    id: '8',
    content: 'Can you review my component architecture and suggest improvements?',
    timestamp: createDate(2880), // 2 days ago
  },
  {
    id: '9',
    content: 'How do I implement dark mode theme switching?',
    timestamp: createDate(4320), // 3 days ago
  },
  {
    id: '10',
    content: 'Help me understand Redux Toolkit and RTK Query',
    timestamp: createDate(5760), // 4 days ago
  },
  {
    id: '11',
    content: 'What are the security best practices for mobile apps?',
    timestamp: createDate(7200), // 5 days ago
  },
  {
    id: '12',
    content: 'How to implement offline functionality with AsyncStorage?',
    timestamp: createDate(10080), // 1 week ago
  },
  {
    id: '13',
    content: 'Can you explain React Native\'s new architecture (Fabric/TurboModules)?',
    timestamp: createDate(12960), // 9 days ago
  },
  {
    id: '14',
    content: 'I\'m having issues with keyboard handling in my forms',
    timestamp: createDate(20160), // 2 weeks ago
  },
  {
    id: '15',
    content: 'How to implement biometric authentication in React Native?',
    timestamp: createDate(25920), // 18 days ago
  },
  {
    id: '16',
    content: 'What\'s the best approach for handling deep linking?',
    timestamp: createDate(30240), // 3 weeks ago
  },
  {
    id: '17',
    content: 'Help me optimize my app\'s bundle size and performance',
    timestamp: createDate(43200), // 1 month ago
  },
  {
    id: '18',
    content: 'How do I implement push notifications with Firebase Cloud Messaging?',
    timestamp: createDate(50400), // 5 weeks ago
  },
  {
    id: '19',
    content: 'Can you help me set up automated testing for my React Native app?',
    timestamp: createDate(60480), // 6 weeks ago
  },
  {
    id: '20',
    content: 'What are the differences between Expo and bare React Native?',
    timestamp: createDate(86400), // 2 months ago
  },
];

// Alternative: More varied message types
export const dummyMessagesVaried: Message[] = [
  {
    id: 'msg1',
    content: 'Hello! Can you help me with my React Native project?',
    timestamp: createDate(2),
  },
  {
    id: 'msg2',
    content: 'What\'s the weather like today?',
    timestamp: createDate(15),
  },
  {
    id: 'msg3',
    content: 'Write a function to calculate fibonacci numbers',
    timestamp: createDate(30),
  },
  {
    id: 'msg4',
    content: 'Explain quantum computing in simple terms',
    timestamp: createDate(75),
  },
  {
    id: 'msg5',
    content: 'Help me plan a vacation to Japan',
    timestamp: createDate(180),
  },
  {
    id: 'msg6',
    content: 'What are some good books to read this year?',
    timestamp: createDate(300),
  },
  {
    id: 'msg7',
    content: 'Can you create a workout plan for beginners?',
    timestamp: createDate(500),
  },
  {
    id: 'msg8',
    content: 'Translate this text to Spanish: Hello, how are you?',
    timestamp: createDate(800),
  },
  {
    id: 'msg9',
    content: 'What are the latest trends in web development?',
    timestamp: createDate(1200),
  },
  {
    id: 'msg10',
    content: 'Help me write a cover letter for a software engineer position',
    timestamp: createDate(1800),
  },
];

// Function to generate random messages for testing
export const generateRandomMessages = (count: number): Message[] => {
  const sampleContents = [
    'How do I fix this bug in my code?',
    'Can you explain machine learning basics?',
    'What\'s the best way to learn JavaScript?',
    'Help me with my React component',
    'I need advice on career development',
    'What are some good programming resources?',
    'Can you review my algorithm solution?',
    'How do I optimize database queries?',
    'What\'s the difference between SQL and NoSQL?',
    'Help me understand design patterns',
    'How to implement user authentication?',
    'Can you explain REST API best practices?',
    'What are the latest web development trends?',
    'Help me debug this error message',
    'How do I improve my coding skills?',
  ];

  return Array.from({ length: count }, (_, index) => ({
    id: `random_${index + 1}`,
    content: sampleContents[Math.floor(Math.random() * sampleContents.length)],
    timestamp: createDate(Math.floor(Math.random() * 43200)), // Random time within last month
  }));
};

// Export default for easy import
export default dummyMessages;