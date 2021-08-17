const GLib = imports.gi.GLib;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const ByteArray = imports.byteArray;
function getAsusctlData(argv) {
  const asusctl = GLib.find_program_in_path("asusctl");
  return JSON.parse(
    ByteArray.toString(GLib.spawn_command_line_sync(`${asusctl} ${argv} -j`)[1])
  );
}

var asusctlUtl = class {
  constructor(callback) {
    this._smartDevices = [];
    try {
      this._smartDevices = getAsusctlData("--scan")["devices"];
      global.log("[ROG-Manager] test devices: " + e);
    } catch (e) {
      global.log("[ROG-Manager] Unable to find smart devices: " + e);
    }
    this._updated = true;
  }

  get available() {
    return this._smartDevices.length > 0;
  }

  get updated() {
    return this._updated;
  }

  set updated(updated) {
    this._updated = updated;
  }

  get temp() {
    return this._smartDevices.map((device) => {
      return {
        label: getAsusctlData(`--info ${device["name"]}`)["model_name"],
        temp: parseFloat(
          getAsusctlData(`--attributes ${device["name"]}`).temperature.current
        ),
      };
    });
  }

  destroy(callback) {
    this._smartDevices = [];
  }

  execute(callback) {
    this._updated = true;
  }
};
