import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Open the camera or photo library for a food photo.
 * @param {'camera'|'library'} source
 * @returns {Promise<string|null>} local uri, or null if cancelled/denied
 */
export default async function pickFoodPhoto(source) {
  if (source === 'camera') {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to snap your meals.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return null;
    }
  }
  const launch = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const result = await launch({ mediaTypes: ['images'], quality: 1 });
  return result.canceled ? null : result.assets?.[0]?.uri ?? null;
}
