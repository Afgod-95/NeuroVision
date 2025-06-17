import uuid from 'react-native-uuid';

export const uniqueConvId = uuid.v4() as string;
console.log('Generated UUID:', uniqueConvId);
