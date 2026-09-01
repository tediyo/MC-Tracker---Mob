import { AppRegistry } from 'react-native';
import App from './App';
import { registerBackgroundFcmHandler } from './src/services/notificationService';

// Register FCM Background Handler
registerBackgroundFcmHandler();

AppRegistry.registerComponent('main', () => App);
