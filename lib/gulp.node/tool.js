'use strict';


const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const {Readable, Writable, Transform} = require('stream');

const gulp = require('gulp');
const del = require('del');
const multimatch = require('multimatch');

function gulpDel() {
  return new Writable({
    write(file, encoding, callback) {
      del.sync(file.path);
      callback(null);
    },
    objectMode: true,
  });
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

function FileInfo(info) {
  this.ref = Object.assign({
    name: '',
    src: '',
    toExt: null,
    handle: null,
  }, info);
  this.handle = this.ref.handle;
  Reflect.deleteProperty(this.ref, 'handle');
}

FileInfo.prototype.getMode = function getMode(mode) {
  return Object.assign({}, this.ref, {
    mode,
    handle: this.handle === null
      ? _ => groupTransform(readable => readable)
      : _ => groupTransform(readable => this.handle(readable, mode, this.ref))
    ,
  });
};

function GulpTool(conf, list) {
  this.conf = Object.assign({
    cwd: process.cwd(),
    src: 'src',
    mode: {
      dev: {
        dist: 'dist/dev',
      },
    },
  }, conf);
  this.list = list.map(item => {
    return new FileInfo(item);
  });
}

GulpTool.prototype.getByName = function getByName(mode, name) {
  let info = this.list.find(item => item.ref.name === name);
  return info == null || mode == null
    ? null
    : info.getMode(mode)
  ;
};

GulpTool.prototype.getByPath = function getByPath(mode, pathPart) {
  let info = this.list.find(item => {
    let pathMatch = multimatch(pathPart, item.ref.src);
    return pathMatch.length > 0;
  });
  return info == null || mode == null
    ? null
    : info.getMode(mode)
  ;
};

GulpTool.prototype.getTask = function getTask(mode, name) {
  let info = this.getByName(mode, name);
  let distPath = this.conf.mode[mode].dist;
  let inputConf = {
    base: path.join(this.conf.cwd, this.conf.src),
  };
  let fn = function () {
    return gulp.src(info.src, inputConf)
      .pipe(info.handle())
      .pipe(gulp.dest(distPath))
    ;
  };
  Reflect.defineProperty(fn, 'name', {value: `handle_${mode}_${name}`});
  return fn;
};

GulpTool.prototype.getTaskCleanDist = function getTaskCleanDist(mode) {
  let distPath = this.conf.mode[mode].dist;
  let fn = async function () {
    await del(distPath, {force: true});
    await fsPromises.mkdir(distPath, {recursive: true});
  };
  Reflect.defineProperty(fn, 'name', {value: `cleanDist_${mode}`});
  return fn;
};

GulpTool.prototype.getTaskMkdir = function getTaskMkdir(mode, pathPart) {
  let distPath = this.conf.mode[mode].dist;
  let fn = async function () {
    await fsPromises.mkdir(path.join(distPath, pathPart), {recursive: true});
  };
  Reflect.defineProperty(fn, 'name', {value: `mkdir_${mode}_${pathPart}`});
  return fn;
};

GulpTool.prototype.getTaskLink = function getTaskLink(mode, destPathPart, relativePath) {
  let cwd = this.conf.cwd;
  let distPath = this.conf.mode[mode].dist;
  let fn = async function () {
    let srcRelativePath = path.relative(
      path.join(cwd, distPath, destPathPart),
      path.join(cwd, relativePath)
    );
    await fsPromises.symlink(
      srcRelativePath,
      path.join(distPath, destPathPart)
    );
  };
  Reflect.defineProperty(fn, 'name', {value: `link_${mode}_${destPathPart}`});
  return fn;
};

GulpTool.prototype.getTaskLinks = function getTaskLinks(mode, list) {
  let cwd = this.conf.cwd;
  let distPath = this.conf.mode[mode].dist;
  let fn = function () {
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
  Reflect.defineProperty(fn, 'name', {value: `links_${mode}`});
  return fn;
};

GulpTool.prototype.getTaskLinkNodeModules = function getTaskLinkNodeModules(mode) {
  let fn = this.getTaskLink(mode, 'node_modules', 'node_modules');
  return fn;
};

module.exports = {
  groupTransform,
  GulpTool,
  gulpDel,
};

