// Measures how long the GPU spends drawing each frame, so quality decisions do not
// depend on a frame rate the browser may be capping for its own reasons.
export class GpuTimer {
  static create(renderer) {
    const gl = renderer.getContext();
    const ext = gl.getExtension?.('EXT_disjoint_timer_query_webgl2');
    return ext ? new GpuTimer(gl, ext) : null;
  }

  constructor(gl, ext) {
    this.gl = gl;
    this.ext = ext;
    this.pending = [];
    this.samples = [];
    this.query = null;
  }

  begin() {
    this.collect();
    if (this.query || this.pending.length > 4) return false;
    this.query = this.gl.createQuery();
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.query);
    return true;
  }

  end() {
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.query);
    this.query = null;
  }

  collect() {
    const { gl, ext } = this;
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    while (this.pending.length && gl.getQueryParameter(this.pending[0], gl.QUERY_RESULT_AVAILABLE)) {
      const q = this.pending.shift();
      if (!disjoint) this.samples.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(q);
    }
  }

  // Median milliseconds since the last call, or null with too few samples to judge.
  median() {
    this.collect();
    const s = this.samples.sort((a, b) => a - b);
    this.samples = [];
    return s.length >= 8 ? s[s.length >> 1] : null;
  }
}
