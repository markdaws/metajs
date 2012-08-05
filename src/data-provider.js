metajs.DataProvider = function(file) {
    this._file = file;
};

metajs.DataProvider.prototype = {

    // TODO: What about node?

    isLittleEndian: true,

    // - options
    //  - start: (optional) offset in bytes, defaults to 0
    //  - length: bytes to read, required
    //  - littleEndian: (optional) defaults to false
    loadRange: function(options, callback) {

        if(options.count == undefined) {
            throw 'count field required in options parameter';
        }

        var start = options.start || 0;
        var littleEndian = (options.littleEndian != undefined) 
            ? options.littleEndian 
            : this.isLittleEndian;

        var reader = new FileReader();
        var self = this;
        reader.onerror = function(error) {
            callback(error);
        };

        reader.onloadend = function(evt) {
            var data = new jDataView(evt.target.result, 0, undefined, littleEndian);
            data.__start = start;
            data.__length = length;
            data.__file = self._file;
            callback(null, data);
        };
        
        // TODO: What about node ...
        if (this._file.webkitSlice) {
            blob = this._file.webkitSlice(start, start + options.count);
        } else if (this._file.mozSlice) {
            blob = this._file.mozSlice(start, start + options.count);
        }
        else {
            callback({ unsupportedBrowser: true });
            return;
        }

        //reader.readAsArrayBuffer(blob);
        reader.readAsBinaryString(blob);
        //reader.readAsText(blob, 'ascii');        
    }
};