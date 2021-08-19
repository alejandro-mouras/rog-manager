const GLib = imports.gi.GLib;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const CommandLineUtil = Me.imports.commandLineUtil;

var AsusctlUtil = class extends CommandLineUtil.CommandLineUtil {
  constructor() {
    super();
    let path = GLib.find_program_in_path("asusctl");
    this._argv = path ? [path] : null;
    this.path = path;
  }

  get asusHealth() {
    try {
      GLib.spawn_command_line_sync("asusctl")[1].toString().trim();
      return true;
    } catch (e) {
      return false;
    }
  }

  get availableProfiles() {
    let profiles = JSON.parse(
      GLib.spawn_command_line_sync(this.path + " profile -l")[1]
        .toString()
        .trim()
        .slice(23)
    );
    return profiles;
  }

  get actualProfile() {
    let profile = JSON.parse(
      GLib.spawn_command_line_sync(this.path + " profile -a")[1]
        .toString()
        .trim()
        .slice(16)
    );
    return profile;
  }

  set newProfile(prof) {
    GLib.spawn_command_line_sync(this.path + " profile " + prof);
  }

  get actualGraphics() {
    let graphics = GLib.spawn_command_line_sync(this.path + " graphics -g")[1]
      .toString()
      .trim()
      .slice(23);

    return graphics;
  }

  set newGraphics(graph) {
    GLib.spawn_command_line_sync(this.path + " graphics -m " + graph);
  }
  set newChargeLimit(charge) {
    GLib.spawn_command_line_sync(this.path + " -c " + charge);
  }

  get actualKeyBright() {
    let bright = GLib.spawn_command_line_sync(this.path + " -k")[1]
      .toString()
      .trim()
      .slice(33);

    return bright;
  }

  set newKeyBright(charge) {
    GLib.spawn_command_line_sync(this.path + " -k " + charge);
  }

  set newKeyLedMode(mode) {
    GLib.spawn_command_line_sync(this.path + " led-mode " + mode);
  }
};
