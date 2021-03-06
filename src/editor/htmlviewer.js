var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var FileSystem = require('./../filesystem/filesystem')

inherits(HtmlEditor, EventEmitter)

function HtmlEditor (options) {
  var self = this
  if (!(self instanceof HtmlEditor)) return new HtmlEditor(options)

  options = options || {}
  self.title = options.title || 'no name'
  self.container = options.container || document.createElement('div')
  self.container.className = 'editor-view'
  self.bindedTab = null

  var dom = options.textarea
  if (!dom) {
    dom = document.createElement('div')
    dom.className = 'view html-viewer'
    self.container.appendChild(dom)
  }
  self.dom = dom
  self.dom.innerHTML = options.content || ''

  self._remote = null
  self._workingFile = null
}

HtmlEditor.prototype.open = function (filePath, remote) {
  var self = this
  if (self._remote) {
    throw Error('already binded!')
  }
  self._workingFile = FileSystem.getFileByPath(filePath)

  self._remote = remote
  if (remote && self._workingFile) self.dom.innerHTML = self._remote.yFSNodes.get(self._workingFile.contentID)

  self._changeFileInfo = function () { self.bindedTab.rename(self._workingFile.name) }
  self._workingFile.on('change', self._changeFileInfo)
}
HtmlEditor.prototype.close = function () {
  var self = this
  self.dom.innerHTML = ''
  self._remote = null
  self._workingFile.removeListener('change', self._changeFileInfo)
  self._workingFile = null
}
HtmlEditor.prototype.getWorkingFile = function () {
  var self = this
  return self._workingFile || {}
}
HtmlEditor.prototype.bindTab = function (tab) {
  var self = this
  self.bindedTab = tab
}
module.exports = HtmlEditor
