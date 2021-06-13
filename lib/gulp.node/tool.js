'use strict';


const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const {Readable, Writable, Transform} = require('stream');

const gulp = require('gulp');
// const multimatch = require('multimatch');


async function _fsRm(path, option) {
  try {
    await fsPromises.access(path, fs.constants.F_OK);
    await fsPromises.rm(path, Object.assign({
      recursive: false,
      force: true,
    }, option));
  } catch {
    // 目錄不存在
  }
}


function groupTransform(handlePipeGroup) {
  let readable = new Readable({
    read(size) {},
    objectMode: true,
  });
  let currChunk = null;
  let currCallback = null;
  handlePipeGroup(readable)
    .pipe(new Writable({
      write(chunk, encoding, callback) {
        let theCurrCallback = currCallback;
        currChunk = null;
        currCallback = null;
        theCurrCallback(null, chunk);
        callback(null);
      },
      objectMode: true,
    }))
  ;

  return new Transform({
    transform(chunk, encoding, callback) {
      currChunk = chunk;
      currCallback = callback;
      readable.push(chunk, encoding);
    },
    flush(callback) {
      readable.push(null);
      callback(null);
    },
    objectMode: true,
  });
}

function GulpTool(conf, list) {
  this._ynInit = false;
  this.conf = conf;
}

GulpTool.prototype.init = function use(mode) {
  let fn = (done) => {
    this.conf.dist = this.conf.dist[mode];
    this.list = this.conf.filterList
      .filter(item => item.handle.hasOwnProperty(mode) && item.handle[mode] !== null)
      .map(item => {
        item.handle = item.handle[mode];
        return Object.assign({
          name: '',
          src: '',
          toExt: null,
          handle: null,
        }, item);
      })
    ;
    this._ynInit = true;
    done();
  };
  Reflect.defineProperty(fn, 'name', {value: `use_${mode}`});
  return fn;
};

GulpTool.prototype._checkHasInit = function checkHasInit() {
  if (!this._ynInit) {
    throw Error('Not initialized yet.');
  }
};

GulpTool.prototype.getByName = function getByName(name) {
  this._checkHasInit();

  let info = this.list.find(item => item.name === name);
  return info == null ? null : info;
};

// GulpTool.prototype.getByPath = function getByPath(pathPart) {
  // this._checkHasInit();

  // let info = this.list.find(item => {
    // let pathMatch = multimatch(pathPart, item.src);
    // return pathMatch.length > 0;
  // });
  // return info == null ? null : info;
// };

GulpTool.prototype.getTaskCleanDist = function getTaskCleanDist() {
  let fn = async () => {
    let distPath = this.conf.dist;
    await _fsRm(distPath, {recursive: true});
    await fsPromises.mkdir(distPath, {recursive: true});
  };
  Reflect.defineProperty(fn, 'name', {value: `cleanDist`});
  return fn;
};

GulpTool.prototype.getTask = function getTask(name) {
  let fn = () => {
    let info = this.getByName(name);
    let distPath = this.conf.dist;
    let inputConf = {
      base: path.join(this.conf.cwd, this.conf.src),
    };
    return gulp.src(info.src, inputConf)
      .pipe(groupTransform(readable => info.handle(readable)))
      .pipe(gulp.dest(distPath))
    ;
  };
  Reflect.defineProperty(fn, 'name', {value: `handle_${name}`});
  return fn;
};

GulpTool.prototype.getTaskLinks = function getTaskLinks(list) {
  let fn = () => {
    let cwd = this.conf.cwd;
    let distPath = this.conf.dist;
    return Promise.all([
      ...list.map(item => fsPromises.symlink(
        path.relative(
          path.join(cwd, distPath, item.to, '..'),
          path.join(cwd, item.src)
        ),
        path.join(distPath, item.to)
      ))
    ]);
  };
  Reflect.defineProperty(fn, 'name', {value: `links`});
  return fn;
};


module.exports = {
  groupTransform,
  GulpTool,
};

