import { initializeFarragoOscReceiver, initializeFarragoOscSender } from "../initializers";
import { FarragoOscReceiver } from "./farragoOscReceiver";
import { FarragoOscSender } from "./farragoOscSender";

export class FarragoOscPinger {
  snd: FarragoOscSender;
  rcv: FarragoOscReceiver;

  constructor() {
    this.snd = initializeFarragoOscSender();
    this.rcv = initializeFarragoOscReceiver();
  }

  async ping() {
    return new Promise<boolean>((resolve, reject) => {
      try {
        const unsubscribe = this.rcv.subscribeToPing(() => {
          console.log("in handler");
          clearTimeout(timer);
          unsubscribe();
          resolve(true);
        });

        const timer = setTimeout(() => {
          console.log("in timeout");
          unsubscribe();
          resolve(false);
        }, 1000);

        this.snd.ping();
      } catch (err) {
        reject(err);
      }
    });
  }
}
