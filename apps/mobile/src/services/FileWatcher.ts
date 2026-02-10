import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import {
  FileWatcherServiceCore,
  FileWatcherEvent,
  AppStateLike,
  EventEmitterLike
} from './fileWatcherCore';

class FileWatcherService extends FileWatcherServiceCore {
  constructor() {
    super(
      AppState as unknown as AppStateLike,
      DeviceEventEmitter as unknown as EventEmitterLike
    );
  }
}

export type { FileWatcherEvent };
export { FileWatcherService };
export const fileWatcher = new FileWatcherService();
