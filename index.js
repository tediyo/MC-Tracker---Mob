import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { registerBackgroundFcmHandler } from './src/services/notificationService';

// Register FCM Background Handler
registerBackgroundFcmHandler();

// Register Notifee Background Event Handler (handles notifications when app is swiped/killed)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  console.log('[Notifee] Background Event received:', type, notification?.id);
});

AppRegistry.registerComponent('main', () => App);
