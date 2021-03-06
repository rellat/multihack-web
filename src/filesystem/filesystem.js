/* globals */

var File = require('./file')
var Directory = require('./directory')
var util = require('./util')

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(FileSystem, EventEmitter)

function FileSystem () {
  var self = this
  if (!(self instanceof FileSystem)) return new FileSystem()

  self._tree = new Directory({
    name: '@',
    type: util.DIRECTORY_TYPE,
    contentID: 'root',
    parentPath: '',
    nodes: []
  })
}

FileSystem.prototype.mkdir = function (yfsnode) { // Makes a directory
  var self = this
  if (!self.existsByPath(yfsnode.parentPath + '/' + yfsnode.name)) {
    self.getFileByPath(yfsnode.parentPath).nodes.push(
      new Directory(yfsnode)
    )
    return true
  }
  return false
}

FileSystem.prototype.mkfile = function (yfsnode) { // Makes an empty file
  var self = this
  if (!self.existsByPath(yfsnode.parentPath + '/' + yfsnode.name)) {
    self.getFileByPath(yfsnode.parentPath).nodes.push(
      new File(yfsnode)
    )
    return true
  }
  return false
}

FileSystem.prototype.changeFileInfoSync = function (yfsnode) { // Makes an empty file
  var self = this
  if (self.existsBycontentID(yfsnode.contentID)) {
    self.getFileByContentID(yfsnode.contentID).change(yfsnode)
    return true
  }
  return false
}
FileSystem.prototype.changeDirInfoSync = function (yfsnode) { // Makes a directory
  var self = this
  if (self.existsBycontentID(yfsnode.contentID)) {
    var node = self.getFileByContentID(yfsnode.contentID)
    node.change(yfsnode)
    self.changeSubDirRecursive(node.path, node.nodes) // change sub nodes parentPath recursively.
    return true
  }
  return false
}
FileSystem.prototype.changeFileInfo = function (path, newMeta) { // Makes an empty file
  var self = this
  var node = self.getFileByPath(path)
  if (node) {
    node.change(newMeta)
    return true
  }
  return false
}
FileSystem.prototype.changeDirInfo = function (path, newMeta) { // Makes a directory
  var self = this
  var node = self.getFileByPath(path)
  if (node) {
    node.change(newMeta)
    self.changeSubDirRecursive(node.path, node.nodes)
    return true
  }
  return false
}
FileSystem.prototype.changeSubDirRecursive = function (parentPath, nodeList) { // Makes a directory
  var self = this
  nodeList.forEach(function (node) {
    node.change({parentPath: parentPath})
    if (node.type === util.DIRECTORY_TYPE) self.changeSubDirRecursive(node.path, node.nodes)
  })
}

// Recursive node search with file path
FileSystem.prototype.getFileByPath = function (path, nodeList) {
  var self = this
  if (path === '@' || path === '') return self._tree

  nodeList = nodeList || self._tree.nodes
  for (var i = 0; i < nodeList.length; i++) {
    if (nodeList[i].path === path) {
      return nodeList[i]
    } else if (nodeList[i].type === util.DIRECTORY_TYPE) {
      var recur = self.getFileByPath(path, nodeList[i].nodes)
      if (recur) return recur
    }
  }
  return undefined
}

// Recursive node search with contentID
FileSystem.prototype.getFileByContentID = function (contentID, nodeList) {
  var self = this

  nodeList = nodeList || self._tree.nodes
  for (var i = 0; i < nodeList.length; i++) {
    if (nodeList[i].contentID === contentID) {
      return nodeList[i]
    } else if (nodeList[i].type === util.DIRECTORY_TYPE) {
      var recur = self.getFileByContentID(contentID, nodeList[i].nodes)
      if (recur) return recur
    }
  }
  return undefined
}

// Checks if a file/directory exists at a path
FileSystem.prototype.existsByPath = function (path) {
  var self = this
  return !!self.getFileByPath(path)
}
FileSystem.prototype.existsBycontentID = function (contentID) {
  var self = this
  return !!self.getFileByContentID(contentID)
}

// get all files on parentPath
FileSystem.prototype.getSubFilesInPath = function (path) { // Makes a directory
  var self = this
  var node = self.getFileByPath(path)
  var fileContainer = []
  if (node) {
    self.getSubFilesRecursive(node.path, node.nodes, fileContainer)
  }
  return fileContainer
}
FileSystem.prototype.getSubFilesRecursive = function (parentPath, nodeList, fileContainer) { // Makes a directory
  var self = this
  nodeList.forEach(function (node) {
    fileContainer.push(node)
    if (node.type === util.DIRECTORY_TYPE) self.getSubFilesRecursive(node.path, node.nodes, fileContainer)
  })
  return fileContainer
}

// Deletes a file/directory on a path
FileSystem.prototype.delete = function (path) {
  var self = this
  var parentFile = self.getFileByPath(util.getParentPath(path))
  if (parentFile) {
    parentFile.nodes = parentFile.nodes.filter(function (e) {
      if (e.path === path) return false
      return true
    })
  }
}

FileSystem.prototype.getFileSync = function (node) {
  var self = this
  self._buildPath(node.parentPath)
  // network 에서 sync를 할 때 파일이 폴더 구조 순서대로 안 오는 경우에 대비해서 미리 폴더구조를 만드는 것이다.

  if (self.existsByPath(node.parentPath + '/' + node.name)) {
    if (node.type === util.DIRECTORY_TYPE) self.changeDirInfoSync(node)
    else self.changeFileInfoSync(node)
  } else {
    if (node.type === util.DIRECTORY_TYPE) self.mkdir(node)
    else self.mkfile(node)
  }
}

// Ensures all directories have been built along a path
FileSystem.prototype._buildPath = function (path) {
  var self = this

  var split = path.split('/')
  for (var i = 0; i <= split.length; i++) {
    var check = split.slice(0, i).join('/')
    if (!self.existsByPath(check)) {
      self.mkdir({
        name: util.getFilename(check),
        parentPath: util.getParentPath(check)
      })
    }
  }
}

// Returns the useable part of the tree
FileSystem.prototype.getTree = function () {
  var self = this

  // sort file tree
  nodeSortRecursive(self._tree.nodes, 'asc')

  return self._tree.nodes
}

function nodeSortRecursive (nodes, order) {
  order = (order === 'asc') ? order : 'desc'
  nodes.sort(function (a, b) {
    // Compare the 2 dates
    if (order === 'asc') {
      if (a.path < b.path) return -1
      if (a.path > b.path) return 1
    } else {
      if (a.path > b.path) return -1
      if (a.path < b.path) return 1
    }
    return 0
  })
  nodes.forEach(function (node) {
    if (node.type === util.DIRECTORY_TYPE) nodeSortRecursive(node.nodes, order)
  })
}

module.exports = new FileSystem()
