export class PressLatch {
  private pressed = false;
  down(isRepeat = false): boolean {
    if (isRepeat || this.pressed) return false;
    this.pressed = true;
    return true;
  }
  up(): void { this.pressed = false; }
  reset(): void { this.pressed = false; }
}
