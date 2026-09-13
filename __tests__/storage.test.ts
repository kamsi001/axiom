import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Mobile Storage Shim Environment', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should successfully store and retrieve a data entry', async () => {
    await AsyncStorage.setItem(
      'user_session',
      JSON.stringify({ name: 'Kiro' }),
    );

    const sessionData = await AsyncStorage.getItem('user_session');
    const parsed = JSON.parse(sessionData || '{}');

    expect(parsed.name).toBe('Kiro');
  });

  it('should return null if an entry does not exist', async () => {
    const item = await AsyncStorage.getItem('non_existent_key');
    expect(item).toBeNull();
  });
});
