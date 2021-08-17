const ByteArray = imports.byteArray;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

var CommandLineUtil = class {
  constructor() {
    this._argv = null;
    this._updated = false;
  }

  execute(callback) {
    try {
      this._callback = callback;
      let [exit, pid, stdinFd, stdoutFd, stderrFd] = GLib.spawn_async_with_pipes(
        null /* cwd */,
        this._argv /* args */,
        null /* env */,
        GLib.SpawnFlags.DO_NOT_REAP_CHILD,
        null /* child_setup */
      );
      let stdout = new Gio.UnixInputStream({ fd: stdoutFd, close_fd: true });
      let outReader = new Gio.DataInputStream({ base_stream: stdout });

      let stderr = new Gio.UnixInputStream({ fd: stderrFd, close_fd: true });
      let errReader = new Gio.DataInputStream({ base_stream: stderr });

      GLib.close(stdinFd);

      let childWatch = GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, (pid, status, requestObj) => {
        let output = [];
        let error_output = [];
        let [line, size] = [null, 0];

        while (([line, size] = outReader.read_line(null)) != null && line != null) {
          if (line) output.push(ByteArray.toString(line));
        }
        stdout.close(null);

        while (([line, size] = errReader.read_line(null)) != null && line != null) {
          if (line) error_output.push(ByteArray.toString(line));
        }
        stderr.close(null);

        GLib.source_remove(childWatch);
        this._output = output;
        this._error_output = error_output;
        this._updated = true;
        callback();
      });
    } catch (e) {
      global.log(e.toString());
    }
  }

  get available() {
    return this._argv != null;
  }

  get updated() {
    return this._updated;
  }

  set updated(updated) {
    this._updated = updated;
  }

  destroy() {
    this._argv = null;
  }
};
