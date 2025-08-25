export class Semaphore {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.count < this.max) {
      this.count++;
      return () => this.release();
    }

    return new Promise((res) => {
      this.queue.push(() => {
        this.count++;
        res(() => this.release());
      });
    });
  }

  release() {
    const next = this.queue.shift();
    if (next) {
      next();
    } else if (this.count > 0) {
      this.count--;
    }
  }
}
