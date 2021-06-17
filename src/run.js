
// NOTE:
// gulpRun 是參考 gulp-cli 調用 gulp 的方式。
// gulpRun 的優勢：
// 1. 直接調用 `gulp`。
// 2. 不會更改預期的 `process.cwd()` 路徑。


import colors from 'ansi-colors';
import gulp from 'gulp';
import prettyTime from 'pretty-hrtime';


// https://github.com/gulpjs/gulp-cli/blob/2d8a320/lib/shared/exit.js
// Fix stdout truncation on windows
function exit(code) {
  /* istanbul ignore next */
  if (process.platform === 'win32' && process.stdout.bufferSize) {
    process.stdout.once('drain', function() {
      process.exit(code);
    });
    return;
  }
  process.exit(code);
}


let _isInit = false;
function _gulpInit() {
  if (_isInit) {
    return;
  }
  _isInit = true;

  function loog(...args) {
    console.log(...args);
  }
  loog.error = function (...args) {
    console.error(...args);
  };

  // Format orchestrator errors
  /* istanbul ignore next */
  function formatError(e) {
    if (!e.error) {
      return e.message;
    }

    // PluginError
    if (typeof e.error.showStack === 'boolean') {
      return e.error.toString();
    }

    // Normal error
    if (e.error.stack) {
      return e.error.stack;
    }

    // Unknown (string, number, etc.)
    return new Error(String(e.error)).stack;
  }

  // logEvents: gulp-cli/lib/versioned/^4.0.0/log/events.js
  (function (gulp) {
    let loggedErrors = [];

    gulp.on('start', function (evt) {
      /* istanbul ignore next */
      // TODO: batch these
      // so when 5 tasks start at once it only logs one time with all 5
      let level = evt.branch ? 'debug' : 'info';
      loog(`Gulp ${level} Starting '${colors.cyan(evt.name)}'...`);
    });

    gulp.on('stop', function (evt) {
      let time = prettyTime(evt.duration);
      /* istanbul ignore next */
      let level = evt.branch ? 'debug' : 'info';
      loog(
        `Gulp ${level} Finished '${colors.cyan(evt.name)}' after ${colors.magenta(time)}`
      );
    });

    gulp.on('error', function(evt) {
      var msg = formatError(evt);
      let time = prettyTime(evt.duration);
      let level = evt.branch ? 'debug' : 'error';
      loog(
        `Gulp ${level} Finished '${colors.cyan(evt.name)}'`
        + ` ${colors.red('errored after')} ${colors.magenta(time)}`
      );

      // If we haven't logged this before, log it and add to list
      if (loggedErrors.indexOf(evt.error) === -1) {
        loog.error(msg);
        loggedErrors.push(evt.error);
      }
    });
  })(gulp);

  // logSyncTask: gulp-cli/lib/versioned/^4.0.0/log/sync-task.js
  (function (gulp) {
    let tasks = {};

    function warn() {
      let taskKeys = Object.keys(tasks);

      if (!taskKeys.length) {
        return;
      }

      let taskNames = taskKeys.map(function(key) {
        return tasks[key];
      }).join(', ');

      process.exitCode = 1;

      loog(
        `${colors.red('The following tasks did not complete:')} ${colors.cyan(taskNames)}`
        + '\nDid you forget to signal async completion?'
      );
    }

    function start(e) {
      tasks[e.uid] = e.name;
    }

    function clear(e) {
      delete tasks[e.uid];
    }

    function clearAll() {
      tasks = {};
    }

    process.once('exit', warn);
    gulp.on('start', start);
    gulp.on('stop', clear);
    // When not running in --continue mode, we need to clear everything on error to avoid
    // false positives.
    gulp.on('error', clearAll);
  })(gulp);
}

export default function gulpRun(name, task) {
  _gulpInit();

  let name_, task_;
  if (arguments.length === 1) {
    task_ = name;
    name_ = task_.name || 'NoName';
  } else {
    name_ = name;
    task_ = task;
  }

  gulp.task(name_, task_);
  gulp['series'](name_)(function (err) {
    if (err) {
      exit(1);
    }
  });
}

