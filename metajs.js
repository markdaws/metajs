(function(window) {
    var metajs = window.metajs = {};
;(function(exports) {

    var _$ = exports._$ = exports._$ || {};
    
    _$.ce = function(errorCallback, func) {

        // If the user didn't specify an errorCallback, we assume that
        // the caller of this function is using the (data, callback)
        // pattern, so we can just invoke the callback param on the
        //case of an error
        if(!func) {
            func = errorCallback;
            errorCallback = arguments.callee.caller.arguments[1];
        }

        return function(error, result) {
            if(error) {
                errorCallback(error);
                return;
            }
            func(result);
        };
    };

    // This can have a variable number of args, should be in the format
    // serial(data, action1, action2, ..., actionX, callback);
    // first data param is optional
    _$.serial = function() {
        
        if(arguments.length < 2) {
            throw 'At least one action and callback required';
        }

        var completed = arguments[arguments.length - 1];
        if(typeof completed !== 'function') {
            throw 'Last parameter must be a callback function';
        }
      
        _$.debug && console.dir(arguments);

        var data,
            actionIndex = 0, 
            actionCount;
        if(typeof arguments[0] !== 'function') {
            data = arguments[0];
            actionIndex = 1;
        }
        
        var args = arguments;
        var firstCall = true;
        function run(previousResult) {
            var action = args[actionIndex++];

            _$.debug && console.log('calling:' + (actionIndex - 1));
            
            function runNext(error, result) {
                if(error) {
                    completed(error);
                    return;
                }
                
                if(actionIndex === args.length - 1) {
                    completed(null, result);
                }
                else {
                    run(result);
                }   
            }

            if(firstCall && !previousResult) {
                firstCall = false;
                action(runNext);
            }
            else {
                firstCall = false;
                action(previousResult, runNext);
            }
        }
        run(data);
    };
}(typeof exports === 'undefined' ? window : exports));//
// jDataView by Vjeux - Jan 2010
//
// A unique way to read a binary file in the browser
// http://github.com/vjeux/jDataView
// http://blog.vjeux.com/ <vjeuxx@gmail.com>
//

(function (global) {

    var compatibility = {
        ArrayBuffer: typeof ArrayBuffer !== 'undefined',
        DataView: typeof DataView !== 'undefined' && 'getFloat64' in DataView.prototype,
        NodeBuffer: typeof Buffer !== 'undefined',
// 0.6.0 -> readInt8LE(offset)
        NodeBufferFull: typeof Buffer !== 'undefined' && 'readInt8LE' in Buffer,
// 0.5.0 -> readInt8(offset, endian)
        NodeBufferEndian: typeof Buffer !== 'undefined' && 'readInt8' in Buffer
    };

    var jDataView = function (buffer, byteOffset, byteLength, littleEndian) {
        if (!(this instanceof arguments.callee)) {
            throw new Error("Constructor may not be called as a function");
        }

        this.buffer = buffer;

        // Handle Type Errors
        if (!(compatibility.NodeBuffer && buffer instanceof Buffer) &&
            !(compatibility.ArrayBuffer && buffer instanceof ArrayBuffer) &&
            typeof buffer !== 'string') {
            throw new TypeError('Type error');
        }

        // Check parameters and existing functionnalities
        this._isArrayBuffer = compatibility.ArrayBuffer && buffer instanceof ArrayBuffer;
        this._isDataView = compatibility.DataView && this._isArrayBuffer;
        this._isNodeBuffer = compatibility.NodeBuffer && buffer instanceof Buffer;

        // Default Values
        this._littleEndian = littleEndian === undefined ? true : littleEndian;

        var bufferLength = this._isArrayBuffer ? buffer.byteLength : buffer.length;
        if (byteOffset === undefined) {
            byteOffset = 0;
        }
        this.byteOffset = byteOffset;

        if (byteLength === undefined) {
            byteLength = bufferLength - byteOffset;
        }
        this.byteLength = byteLength;

        if (!this._isDataView) {
            // Do additional checks to simulate DataView
            if (typeof byteOffset !== 'number') {
                throw new TypeError('Type error');
            }
            if (typeof byteLength !== 'number') {
                throw new TypeError('Type error');
            }
            if (typeof byteOffset < 0) {
                throw new Error('INDEX_SIZE_ERR: DOM Exception 1');
            }
            if (typeof byteLength < 0) {
                throw new Error('INDEX_SIZE_ERR: DOM Exception 1');
            }
        }

        // Instanciate
        if (this._isDataView) {
            this._view = new DataView(buffer, byteOffset, byteLength);
            this._start = 0;
        }
        this._start = byteOffset;
        if (byteOffset + byteLength > bufferLength) {
            throw new Error("INDEX_SIZE_ERR: DOM Exception 1");
        }

        this._offset = 0;
    };

    jDataView.createBuffer = function () {
        if (compatibility.NodeBuffer) {
            var buffer = new Buffer(arguments.length);
            for (var i = 0; i < arguments.length; ++i) {
                buffer[i] = arguments[i];
            }
            return buffer;
        }
        if (compatibility.ArrayBuffer) {
            var buffer = new ArrayBuffer(arguments.length);
            var view = new Int8Array(buffer);
            for (var i = 0; i < arguments.length; ++i) {
                view[i] = arguments[i];
            }
            return buffer;
        }

        return String.fromCharCode.apply(null, arguments);
    };

    jDataView.prototype = {

        // Helpers

        getString: function (length, byteOffset) {
            var value;

            // Handle the lack of byteOffset
            if (byteOffset === undefined) {
                byteOffset = this._offset;
            }

            // Error Checking
            if (typeof byteOffset !== 'number') {
                throw new TypeError('Type error');
            }
            if (length < 0 || byteOffset + length > this.byteLength) {
                throw new Error('INDEX_SIZE_ERR: DOM Exception 1');
            }

            if (this._isNodeBuffer) {
                value = this.buffer.toString('ascii', this._start + byteOffset, this._start + byteOffset + length);
            }
            else {
                value = '';
                for (var i = 0; i < length; ++i) {
                    var chr = this.getUint8(byteOffset + i);
                    value += String.fromCharCode(chr > 127 ? 65533 : chr);
                }
            }

            this._offset = byteOffset + length;
            return value;
        },

        getChar: function (byteOffset) {
            return this.getString(1, byteOffset);
        },

        tell: function () {
            return this._offset;
        },

        seek: function (byteOffset) {
            if (typeof byteOffset !== 'number') {
                throw new TypeError('Type error');
            }
            if (byteOffset < 0 || byteOffset > this.byteLength) {
                throw new Error('INDEX_SIZE_ERR: DOM Exception 1');
            }

            return this._offset = byteOffset;
        },

        // Compatibility functions on a String Buffer

        _endianness: function (byteOffset, pos, max, littleEndian) {
            return byteOffset + (littleEndian ? max - pos - 1 : pos);
        },

        _getFloat64: function (byteOffset, littleEndian) {
            var b0 = this._getUint8(this._endianness(byteOffset, 0, 8, littleEndian)),
            b1 = this._getUint8(this._endianness(byteOffset, 1, 8, littleEndian)),
            b2 = this._getUint8(this._endianness(byteOffset, 2, 8, littleEndian)),
            b3 = this._getUint8(this._endianness(byteOffset, 3, 8, littleEndian)),
            b4 = this._getUint8(this._endianness(byteOffset, 4, 8, littleEndian)),
            b5 = this._getUint8(this._endianness(byteOffset, 5, 8, littleEndian)),
            b6 = this._getUint8(this._endianness(byteOffset, 6, 8, littleEndian)),
            b7 = this._getUint8(this._endianness(byteOffset, 7, 8, littleEndian)),

            sign = 1 - (2 * (b0 >> 7)),
            exponent = ((((b0 << 1) & 0xff) << 3) | (b1 >> 4)) - (Math.pow(2, 10) - 1),

            // Binary operators such as | and << operate on 32 bit values, using + and Math.pow(2) instead
            mantissa = ((b1 & 0x0f) * Math.pow(2, 48)) + (b2 * Math.pow(2, 40)) + (b3 * Math.pow(2, 32)) +
                (b4 * Math.pow(2, 24)) + (b5 * Math.pow(2, 16)) + (b6 * Math.pow(2, 8)) + b7;

            if (exponent === 1024) {
                if (mantissa !== 0) {
                    return NaN;
                } else {
                    return sign * Infinity;
                }
            }

            if (exponent === -1023) { // Denormalized
                return sign * mantissa * Math.pow(2, -1022 - 52);
            }

            return sign * (1 + mantissa * Math.pow(2, -52)) * Math.pow(2, exponent);
        },

        _getFloat32: function (byteOffset, littleEndian) {
            var b0 = this._getUint8(this._endianness(byteOffset, 0, 4, littleEndian)),
            b1 = this._getUint8(this._endianness(byteOffset, 1, 4, littleEndian)),
            b2 = this._getUint8(this._endianness(byteOffset, 2, 4, littleEndian)),
            b3 = this._getUint8(this._endianness(byteOffset, 3, 4, littleEndian)),

            sign = 1 - (2 * (b0 >> 7)),
            exponent = (((b0 << 1) & 0xff) | (b1 >> 7)) - 127,
            mantissa = ((b1 & 0x7f) << 16) | (b2 << 8) | b3;

            if (exponent === 128) {
                if (mantissa !== 0) {
                    return NaN;
                } else {
                    return sign * Infinity;
                }
            }

            if (exponent === -127) { // Denormalized
                return sign * mantissa * Math.pow(2, -126 - 23);
            }

            return sign * (1 + mantissa * Math.pow(2, -23)) * Math.pow(2, exponent);
        },

        _getInt32: function (byteOffset, littleEndian) {
            var b = this._getUint32(byteOffset, littleEndian);
            return b > Math.pow(2, 31) - 1 ? b - Math.pow(2, 32) : b;
        },

        _getUint32: function (byteOffset, littleEndian) {
            var b3 = this._getUint8(this._endianness(byteOffset, 0, 4, littleEndian)),
            b2 = this._getUint8(this._endianness(byteOffset, 1, 4, littleEndian)),
            b1 = this._getUint8(this._endianness(byteOffset, 2, 4, littleEndian)),
            b0 = this._getUint8(this._endianness(byteOffset, 3, 4, littleEndian));

            return (b3 * Math.pow(2, 24)) + (b2 << 16) + (b1 << 8) + b0;
        },

        _getInt16: function (byteOffset, littleEndian) {
            var b = this._getUint16(byteOffset, littleEndian);
            return b > Math.pow(2, 15) - 1 ? b - Math.pow(2, 16) : b;
        },

        _getUint16: function (byteOffset, littleEndian) {
            var b1 = this._getUint8(this._endianness(byteOffset, 0, 2, littleEndian)),
            b0 = this._getUint8(this._endianness(byteOffset, 1, 2, littleEndian));

            return (b1 << 8) + b0;
        },

        _getInt8: function (byteOffset) {
            var b = this._getUint8(byteOffset);
            return b > Math.pow(2, 7) - 1 ? b - Math.pow(2, 8) : b;
        },

        _getUint8: function (byteOffset) {
            if (this._isArrayBuffer) {
                return new Uint8Array(this.buffer, byteOffset, 1)[0];
            }
            else if (this._isNodeBuffer) {
                return this.buffer[byteOffset];
            } else {
                return this.buffer.charCodeAt(byteOffset) & 0xff;
            }
        }
    };

// Create wrappers

    var dataTypes = {
        'Int8': 1,
        'Int16': 2,
        'Int32': 4,
        'Uint8': 1,
        'Uint16': 2,
        'Uint32': 4,
        'Float32': 4,
        'Float64': 8
    };
    var nodeNaming = {
        'Int8': 'Int8',
        'Int16': 'Int16',
        'Int32': 'Int32',
        'Uint8': 'UInt8',
        'Uint16': 'UInt16',
        'Uint32': 'UInt32',
        'Float32': 'Float',
        'Float64': 'Double'
    };

    for (var type in dataTypes) {
        if (!dataTypes.hasOwnProperty(type)) {
            continue;
        }

        // Bind the variable type
        (function (type) {
            var size = dataTypes[type];

            // Create the function
            jDataView.prototype['get' + type] =
                function (byteOffset, littleEndian) {
                    var value;

                    // Handle the lack of endianness
                    if (littleEndian === undefined) {
                        littleEndian = this._littleEndian;
                    }

                    // Handle the lack of byteOffset
                    if (byteOffset === undefined) {
                        byteOffset = this._offset;
                    }

                    // Dispatch on the good method
                    if (this._isDataView) {
                        // DataView: we use the direct method
                        value = this._view['get' + type](byteOffset, littleEndian);
                    }
                    // ArrayBuffer: we use a typed array of size 1 if the alignment is good
                    // ArrayBuffer does not support endianess flag (for size > 1)
                    else if (this._isArrayBuffer && (this._start + byteOffset) % size === 0 && (size === 1 || littleEndian)) {
                        value = new global[type + 'Array'](this.buffer, this._start + byteOffset, 1)[0];
                    }
                    // NodeJS Buffer
                    else if (this._isNodeBuffer && compatibility.NodeBufferFull) {
                        if (littleEndian) {
                            value = this.buffer['read' + nodeNaming[type] + 'LE'](this._start + byteOffset);
                        } else {
                            value = this.buffer['read' + nodeNaming[type] + 'BE'](this._start + byteOffset);
                        }
                    } else if (this._isNodeBuffer && compatibility.NodeBufferEndian) {
                        value = this.buffer['read' + nodeNaming[type]](this._start + byteOffset, littleEndian);
                    }
                    else {
                        // Error Checking
                        if (typeof byteOffset !== 'number') {
                            throw new TypeError('Type error');
                        }
                        if (byteOffset + size > this.byteLength) {
                            throw new Error('INDEX_SIZE_ERR: DOM Exception 1');
                        }
                        value = this['_get' + type](this._start + byteOffset, littleEndian);
                    }

                    // Move the internal offset forward
                    this._offset = byteOffset + size;

                    return value;
                };
        })(type);
    }

    if (typeof jQuery !== 'undefined' && jQuery.fn.jquery >= "1.6.2") {
        var convertResponseBodyToText = function (byteArray) {
            // http://jsperf.com/vbscript-binary-download/6
            var scrambledStr;
            try {
                scrambledStr = IEBinaryToArray_ByteStr(byteArray);
            } catch (e) {
                // http://stackoverflow.com/questions/1919972/how-do-i-access-xhr-responsebody-for-binary-data-from-javascript-in-ie
                // http://miskun.com/javascript/internet-explorer-and-binary-files-data-access/
                var IEBinaryToArray_ByteStr_Script =
                    "Function IEBinaryToArray_ByteStr(Binary)\r\n"+
                    "IEBinaryToArray_ByteStr = CStr(Binary)\r\n"+
                    "End Function\r\n"+
                    "Function IEBinaryToArray_ByteStr_Last(Binary)\r\n"+
                    "Dim lastIndex\r\n"+
                    "lastIndex = LenB(Binary)\r\n"+
                    "if lastIndex mod 2 Then\r\n"+
                    "IEBinaryToArray_ByteStr_Last = AscB( MidB( Binary, lastIndex, 1 ) )\r\n"+
                    "Else\r\n"+
                    "IEBinaryToArray_ByteStr_Last = -1\r\n"+
                    "End If\r\n"+
                    "End Function\r\n";

                // http://msdn.microsoft.com/en-us/library/ms536420(v=vs.85).aspx
                // proprietary IE function
                window.execScript(IEBinaryToArray_ByteStr_Script, 'vbscript');

                scrambledStr = IEBinaryToArray_ByteStr(byteArray);
            }

            var lastChr = IEBinaryToArray_ByteStr_Last(byteArray),
            result = "",
            i = 0,
            l = scrambledStr.length % 8,
            thischar;
            while (i < l) {
                thischar = scrambledStr.charCodeAt(i++);
                result += String.fromCharCode(thischar & 0xff, thischar >> 8);
            }
            l = scrambledStr.length
            while (i < l) {
                result += String.fromCharCode(
                    (thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
                    (thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
                    (thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
                    (thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
                    (thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
                    (thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
                    (thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
                    (thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8);
            }
            if (lastChr > -1) {
                result += String.fromCharCode(lastChr);
            }
            return result;
        };

        jQuery.ajaxSetup({
            converters: {
                '* dataview': function(data) {
                    return new jDataView(data);
                }
            },
            accepts: {
                dataview: "text/plain; charset=x-user-defined"
            },
            responseHandler: {
                dataview: function (responses, options, xhr) {
                    // Array Buffer Firefox
                    if ('mozResponseArrayBuffer' in xhr) {
                        responses.text = xhr.mozResponseArrayBuffer;
                    }
                    // Array Buffer Chrome
                    else if ('responseType' in xhr && xhr.responseType === 'arraybuffer' && xhr.response) {
                        responses.text = xhr.response;
                    }
                    // Internet Explorer (Byte array accessible through VBScript -- convert to text)
                    else if ('responseBody' in xhr) {
                        responses.text = convertResponseBodyToText(xhr.responseBody);
                    }
                    // Older Browsers
                    else {
                        responses.text = xhr.responseText;
                    }
                }
            }
        });

        jQuery.ajaxPrefilter('dataview', function(options, originalOptions, jqXHR) {
            // trying to set the responseType on IE 6 causes an error
            if (jQuery.support.ajaxResponseType) {
                if (!options.hasOwnProperty('xhrFields')) {
                    options.xhrFields = {};
                }
                options.xhrFields.responseType = 'arraybuffer';
            }
            options.mimeType = 'text/plain; charset=x-user-defined';
        });
    }

    global.jDataView = (global.module || {}).exports = jDataView;

})(this);metajs.DataProvider = function(file) {
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
};metajs.ifdDataFormat = {
    ubyte: 1,
    ascii: 2,
    ushort: 3,
    ulong: 4,
    urat: 5,
    undef: 7,
    slong: 9,
    srat: 10
};
metajs.ifdDataFormatByteLength = {
    1: 1,  // unsigned byte
    2: 1,  // ascii string
    3: 2,  // unsigned short
    4: 4,  // unsigned long
    5: 8,  // unsigned rational
    6: 1,  // signed byte
    7: 1,  // undefined
    8: 2,  // signed short
    9: 4,  // signed long
    10: 8, // signed rational
    11: 4, // single float
    12: 8  // double float
};metajs.imageTagIdToField = {
    256: 'width',
    257: 'height',
    258: 'bitsPerPixel',
    259: 'compression',
    262: 'photometricInterpretation',
    270: 'imageDescription',
    271: 'make',
    272: 'model',
    273: 'stripOffsets',
    274: 'orientation',
    277: 'samplesPerPixel',
    278: 'rowsPerStrip',
    279: 'stripByteCounts',
    282: 'xResolution',
    283: 'yResolution',
    284: 'planarConfiguration',
    296: 'resolutionUnit',
    301: 'transferFunction',
    305: 'software',
    306: 'dateTime',
    315: 'artist',
    318: 'whitePoint',
    319: 'primaryChromaticities',
    513: 'jpegInterchangeFormat',
    514: 'jpegInterchangeFormatLength',
    529: 'yCbCrCoefficients',
    530: 'yCbCrSubSampling',
    531: 'yCbCrPositioning',
    532: 'referenceWhiteBlack',
    33432: 'copyright'
};
metajs.exifTagIdToField = {
    33434: 'exposureTime',
    33437: 'fNumber',
    34850: 'exposureProgram',
    34852: 'spectralSensitivity',
    34855: 'isoSpeedRatings',
    34856: 'oecf',
    36864: 'exifVersion',
    36867: 'dateTimeOriginal',
    36868: 'dateTimeDigitized',
    37121: 'componentsConfiguration',
    37122: 'compressedBitsPerPixel',
    37377: 'shutterSpeedValue',
    37378: 'apertureValue',
    37379: 'brightnessValue',
    37380: 'exposureBiasValue',
    37381: 'maxApertureValue',
    37383: 'subjectDistance',
    37384: 'lightSource',
    37385: 'flash',
    37386: 'focalLength',
    37396: 'subjectArea',
    37500: 'makerNote',
    37510: 'userComment',
    37520: 'subSecTime',
    37521: 'subSecTimeOriginal',
    37522: 'subSecTimeDigitized',
    40960: 'flashpixVersion',
    40961: 'colorSpace',
    40962: 'pixelXDimension',
    40963: 'pixelYDimension',
    40964: 'relatedSoundFile',
    41483: 'flashEnergy',
    41484: 'spatialFrequencyResponse',
    41486: 'focalPlaneXResolution',
    41487: 'focalPlaneYResolution',
    41488: 'focalPlaneResolutionUnit',
    41492: 'subjectLocation',
    41493: 'exposureIndex',
    41495: 'sensingMethod',
    41728: 'fileSource',
    41729: 'sceneType',
    41730: 'cfaPattern',
    41985: 'customRendered',
    41986: 'exposureMethod',
    41987: 'whiteBalance',
    41988: 'digitalZoomRatio',
    41989: 'focalLengthIn35mmFilm',
    41990: 'sceneCaptureType',
    41991: 'gainControl',
    41992: 'contrast',
    41993: 'saturation',
    41994: 'sharpness',
    41995: 'deviceSettingDescription',
    41996: 'subjectDistanceRange',
    42016: 'uniqueImageId'
};metajs.gpsTagIdToField = {
    0: 'versionId',
    1: 'latitudeRef',
    2: 'latitude',
    3: 'longitudeRef',
    4: 'longitude',
    5: 'altitudeRef',
    6: 'altitude',
    7: 'timestamp',
    8: 'satellites',
    9: 'status',
    10: 'measureMode',
    11: 'dop',
    12: 'speedRef',
    13: 'speed',
    14: 'trackRef',
    15: 'track',
    16: 'imgDirectionRef',
    17: 'imgDirection',
    18: 'mapDatum',
    19: 'destLatitudeRef',
    20: 'destLatitude',
    21: 'destLongitudeRef',
    22: 'destLongitude',
    23: 'destBearingRef',
    24: 'destBearing',
    25: 'destDistanceRef',
    26: 'destDistance',
    27: 'processingMethod',
    28: 'areaInformation',
    29: 'datestamp',
    30: 'differential'
};metajs.JpegReader = function JpegReader() {
};

metajs.JpegReader.prototype = {
    read: function(file, callback) {

        var self = this;
        var reader = new FileReader();
        reader.onerror = function(error) {
        };
        reader.onloadend = function(evt) {
            self._readInternal(evt.target.result);
        };

        if (file.webkitSlice) {
            blob = file.webkitSlice();
        } else if (file.mozSlice) {
            blob = file.mozSlice();
        }
        //reader.readAsArrayBuffer(blob);
        reader.readAsBinaryString(blob);
        //reader.readAsText(blob, 'ascii');   
    },

    _readInternal: function(binaryString) {
        //check length

        // JPEG data is in big endian format
        debugger;
        var data = new jDataView(binaryString, 0, undefined, false);

        //SOI marker 0xFFD8
        if(data.getUint8() !== 0xff ||
           data.getUint8() !== 0xd8) {
            callback && callback('Invalid SOI marker');
            return;
        }

        //Search for EXIF app marker 0xFFE1
        while(true) {
            
            //valid markers between FFE0 and FFEE
            var markerByte0 = data.getUint8();
            var markerByte1 = data.getUint8();
            
            if(markerByte0 === 0xff && markerByte1 === 0xe1) {
                //Found exif tag, APP1 marker
                this._readExif(data);
                break;
            }
            else if(markerByte0 === 0xff && markerByte1 < 0xef) {
                //move to next marker, length also includes the size bytes, so sub 2
                var length = data.getUint16() - 2;
                data.seek(data.tell() + length);
            }
            else {
                // not a marker, abort
                debugger;
                break;
            }
        }
    },

    _readExif: function(exifData) {

        var exifLength = exifData.getUint16();

        // Check really is EXIF
        if(exifData.getChar() !== 'E' ||
           exifData.getChar() !== 'x' ||
           exifData.getChar() !== 'i' ||
           exifData.getChar() !== 'f') {
            return null;
           }

        // Two bytes of 0x00
        exifData.seek(exifData.tell() + 2);

        var isBigEndian;

        // TIFF header - 8 bytes
        var tiffStartOffset = exifData.tell();
        var tiffByte0 = exifData.getUint8();
        var tiffByte1 = exifData.getUint8();
        if(tiffByte0 === 0x49 && 
           tiffByte1 === 0x49) {
            // Intel byte align, store bytes right to left
            isBigEndian = false;
        }
        else if(tiffByte0 === 0x4d && 
                tiffByte1 === 0x4d) {
            // Motorola byte align, store bytes left to right
            isBigEndian = true;
        }
        else {
            return null;
        }

        // 6 more bytes of TIFF header 0x002a (or 0x2a00) then 0x08000000
        exifData.seek(exifData.tell() + 6);

        var off = exifData.tell();
        exifData = new jDataView(exifData.buffer, 0, undefined, !isBigEndian);
        exifData.seek(off);

        var values = { 
            image: {},
            exif: {},
            gps: {}
        };

        var ifdDataReader = function(tiffHeaderOrigin, dataReader, dataFormat, 
                                     numberOfComponents, tagId, undefinedHelpers) {
            var dataByteLength = exifjs.ifdDataFormatByteLength[dataFormat] * numberOfComponents;

            var originalOffset = dataReader.tell();
            if(dataByteLength <= 4) {
                // can read directly from this location
            }
            else {
                // need to read from an offset
                var offset = dataReader.getUint32();
                dataReader.seek(tiffHeaderOrigin + offset);
            }

            var data;
            var readFn = null;

            switch(dataFormat) {
            case exifjs.ifdDataFormat.ubyte:
                readFn = function() { return dataReader.getUint8(); };
                break;

            case exifjs.ifdDataFormat.ascii:
                data = '';
                for(var i=0; i<numberOfComponents; ++i) {
                    data += dataReader.getChar();
                }
                break;

            case exifjs.ifdDataFormat.ushort:
                readFn = function() { return dataReader.getUint16(); };
                break;

            case exifjs.ifdDataFormat.ulong:
                readFn = function() { return dataReader.getUint32(); };
                break;

            case exifjs.ifdDataFormat.urat:
                readFn = function() {
                    var numerator = dataReader.getUint32();
                    var denominator = dataReader.getUint32();
                    return numerator / denominator;
                };
                break;

            case exifjs.ifdDataFormat.sbyte:
                readFn = function() { return dataReader.getInt8(); };
                break;

            case exifjs.ifdDataFormat.sshort:
                readFn = function() { return dataReader.getInt16(); };
                break;

            case exifjs.ifdDataFormat.undef:
                readFn = function() { return dataReader.getUint8(); };
                break;

            case exifjs.ifdDataFormat.slong:
                readFn = function() { return dataReader.getInt32(); };
                break;

            case exifjs.ifdDataFormat.srat:
                readFn = function() {
                    var numerator = dataReader.getInt32();
                    var denominator = dataReader.getInt32();
                    return numerator / denominator;                
                };
            }
            
            // If have data to read, could be a single or multiple values
            // in the case of multiple values we store those in an array
            if(readFn) {
                if(undefinedHelpers[tagId]) {
                    data = undefinedHelpers[tagId](dataReader, numberOfComponents);
                }
                else {
                    if(numberOfComponents > 1) {
                        data = [];
                        for(var i=0; i<numberOfComponents; ++i) {
                            data.push(readFn());
                        }
                    }
                    else {
                        data = readFn();
                    }
                }
            }

            // Move to the beginning of the next data field
            dataReader.seek(originalOffset + 4);
            return data;
        };

        // For data that has an undefined type, these helpers know how to
        // process the data
        var undefinedHelpers = {

            // exif version
            36864:function(dataReader, numberOfComponents) {
                // stored as an ascii string
                var data = '';
                for(var i=0; i<numberOfComponents; ++i) {
                    data += dataReader.getChar();
                    }
                return data;
            },

            // flashpix version
            40960:function(dataReader, numberOfComponents) {
                // stored as an ascii string
                var data = '';
                for(var i=0; i<numberOfComponents; ++i) {
                    data += dataReader.getChar();
                    }
                return data;
            },

            
            // user comment
            37510: function(dataReader, numberOfComponents) {

                var encoding1 = dataReader.getUint8(),
                    encoding2 = dataReader.getUint8(),
                    encoding3 = dataReader.getUint8(),
                    encoding4 = dataReader.getUint8(),
                    encoding5 = dataReader.getUint8(),
                    encoding6 = dataReader.getUint8(),
                    encoding7 = dataReader.getUint8(),
                    encoding8 = dataReader.getUint8();

                if(encoding1 === 0x41 &&
                   encoding2 === 0x53 &&
                   encoding3 === 0x43 &&
                   encoding4 === 0x49 &&
                   encoding5 === 0x49 &&
                   encoding6 === 0x00 &&
                   encoding7 === 0x00 &&
                   encoding8 === 0x00) {

                    // ASCII encoding

                    var data = '';
                    for(var i=0; i<numberOfComponents; ++i) {
                        data += dataReader.getChar();
                    }
                    return data;
                }
                else if(encoding1 === 0x4A &&
                        encoding2 === 0x49 &&
                        encoding3 === 0x53 &&
                        encoding4 === 0x00 &&
                        encoding5 === 0x00 &&
                        encoding6 === 0x00 &&
                        encoding7 === 0x00 &&
                        encoding8 === 0x00) {
                    characterCode = CC_JIS;
                    debugger;
                }
                else if(encoding1 === 0x55 &&
                        encoding2 === 0x4e &&
                        encoding3 === 0x49 &&
                        encoding4 === 0x43 &&
                        encoding5 === 0x4f &&
                        encoding6 === 0x44 &&
                        encoding7 === 0x45 &&
                        encoding8 === 0x00) {
                    characterCode = CC_UNICODE;
                    debugger;
                }
                else {
                    characterCode = CC_UNDEFINED;
                    debugger;
                }
            }
        };

        function readIfdBlock(exifData, tagLookupTable) {
            var values = {};
            var ifdEntryCount = exifData.getUint16();
            for(var i=0; i<ifdEntryCount; ++i) {
                var tagId = exifData.getUint16();
                console.log(tagId);
                
                var type = exifData.getUint16();
                console.log(type);
                
                var numberOfComponents = exifData.getUint32();
                console.log(numberOfComponents);

                var data = ifdDataReader(tiffStartOffset, exifData, type, numberOfComponents, tagId, undefinedHelpers);
                if(data) {
                    var fieldName = tagLookupTable[tagId];
                    if(!fieldName) {
                        fieldName = tagId;
                    }
                    values[fieldName] = data;
                }
            }
            
            return values;
        }
        
        //IFD0 - image information
        var imageInfo = readIfdBlock(exifData, exifjs.imageTagIdToField);
        values.image = imageInfo;

        //TODO: What about the last value in the IFD structure????

        var EXIF_IFD_OFFSET = 34665
        if(imageInfo[EXIF_IFD_OFFSET]) {
            // EXIF IFD pointer
            // TODO:
            console.log('found EXIF IFD pointer');
            
            debugger;
            var exifIfdOffset = tiffStartOffset + imageInfo[EXIF_IFD_OFFSET];
            exifData.seek(exifIfdOffset);
            var exifInfo = readIfdBlock(exifData, exifjs.exifTagIdToField);
            values.exif = exifInfo;
            delete imageInfo[EXIF_IFD_OFFSET];
        }
            
        var GPS_IFD_OFFSET = 34853;
        if(imageInfo[GPS_IFD_OFFSET]) {
            // GPS IFD pointer
            // TODO:
            debugger;
            console.log('found GPS IFD pointer');

            var gpsIfdOffset = tiffStartOffset + imageInfo[GPS_IFD_OFFSET];
            exifData.seek(gpsIfdOffset);            
            var gpsInfo = readIfdBlock(exifData, exifjs.gpsTagIdToField);
            values.gps = gpsInfo;
            
            delete imageInfo[GPS_IFD_OFFSET];
        }
        
        var INTEROP_IFD_POINTER = 40965;
        if(imageInfo[INTEROP_IFD_POINTER]) {
            // Interoperability IFD pointer
            // TODO:
            debugger;
            console.log('found interoperability ifd pointer');

            delete imageInfo[INTEROP_IFD_POINTER];
        }




        // Now in First IFD block (Image File Directory)
        
        debugger;
        var pretty = exifjs.prettify(values);
        return values;
    }
};metajs.NefReader = function NefReader() {
};

metajs.NefReader.prototype = {
    read: function(file, callback) {

        var dataProvider = new metajs.DataProvider(file);
        dataProvider.isLittleEndian = false;

        // Read in the initial header information of the NEF file
        // check for magic numbers etc to make sure this is a NEF file
        // and get if the contents is little or big endian
        var readHeader = function(_, callback) {
            dataProvider.loadRange({ start:0, count: 8 }, _$.ce(function(nefData){

                // NEF format similar to TIFF, see: http://lclevy.free.fr/nef/index.html
                var isBigEndian;
                var baseOffset = nefData.tell();
                var byte0 = nefData.getUint8();
                var byte1 = nefData.getUint8();
                if(byte0 === 0x49 &&
                   byte1 === 0x49) {
                    // Intel byte align, store bytes right to left
                    isBigEndian = false;
                }
                else if(byte0 === 0x4d &&
                        byte1 === 0x4d) {
                    // Motorola byte align, store bytes left to right
                    isBigEndian = true;
                }
                else {
                    callback({ invalidFileType: true });
                    return;
                }
                
                // NEF magic bytes
                if(nefData.getUint16() !== 42) {
                    callback({ invalidFileType: true });
                    return;
                }

                callback(null, { 
                    isBigEndian: isBigEndian,

                    // Specifies offset to ifd0 in the file
                    ifd0Offset: 8,

                    // Specifies the base byte offset to which
                    // all IFD value offsets should be added to
                    ifdOffsetBase: 0
                });
            }));
        }

        // Final data will appear here
        var values = {};

        var readIfd0 = function(headerInfo, callback) {

            // Set which endianess we need to use to read the file
            dataProvider.isLittleEndian = !headerInfo.isBigEndian;

            // IFD0 - image information, this contains a small JPG 160x120 plus the information
            // about the offsets to the RAW info, which is what we really want ...
            metajs.IfdReader.read(
                dataProvider,
                headerInfo.ifdOffsetBase,
                headerInfo.ifd0Offset,
                metajs.imageTagIdToField,
                metajs.tiffUndefinedHelpers,
                function(error, ifd0Info) {
                    if(error) {
                        callback(error);
                        return;
                    }

                    debugger;
                    callback(
                        null, 
                        {
                            headerInfo: headerInfo,
                            ifd0Info: ifd0Info
                        });
                }
            );
        };

        var readSubIfd = function(data, callback) {

            var headerInfo = data.headerInfo;
            var ifd0Info = data.ifd0Info;

            var SUB_IFD = 330;
            if(ifd0Info[SUB_IFD]) {
                
                // There are possibly 2 offsets here:
                // 330 - [JPEGImageOffset, RawOffset] we are just interested in the RAW offset
                var rawIfdOffset;
                if(ifd0Info[SUB_IFD].length === 1) {
                    rawIfdOffset = headerInfo.ifdOffsetBase + ifd0Info[SUB_IFD][0];                
                }
                else {
                    rawIfdOffset = headerInfo.ifdOffsetBase + ifd0Info[SUB_IFD][1];
                }
                
                metajs.IfdReader.read(
                    dataProvider,
                    headerInfo.ifdOffsetBase,
                    rawIfdOffset,
                    metajs.imageTagIdToField,
                    metajs.tiffUndefinedHelpers,
                    function(error, rawImageInfo) {
                        if(error) {
                            callback(error);
                            return;
                        }

                        debugger;
                        values.image = rawImageInfo;
                        callback(null, data);
                    }
                );
            }
            else {
                callback(null, data);
            }
        };
        
        var readExifIfd = function(data, callback) {
            
            var headerInfo = data.headerInfo;
            var ifd0Info = data.ifd0Info;

            var EXIF_IFD_OFFSET = 34665
            if(ifd0Info[EXIF_IFD_OFFSET]) {
                
                debugger;
                var exifIfdOffset = headerInfo.ifdOffsetBase + ifd0Info[EXIF_IFD_OFFSET];
                metajs.IfdReader.read(
                    dataProvider,
                    headerInfo.ifdOffsetBase,
                    exifIfdOffset,
                    metajs.exifTagIdToField,
                    metajs.tiffUndefinedHelpers,
                    function(error, exifInfo) {
                        if(error) {
                            callback(error);
                            return;
                        }

                        debugger;
                        values.exif = exifInfo;
                        callback(null, data);
                    }
                );
            }
            else {
                callback(null, data);
            }
        };

        var readGpsIfd = function(data, callback) {
            var headerInfo = data.headerInfo;
            var ifd0Info = data.ifd0Info;

            var GPS_IFD_OFFSET = 34853;
            if(ifd0Info[GPS_IFD_OFFSET]) {
                
                debugger;
                var gpsIfdOffset = headerInfo.ifdOffsetBase + ifd0Info[GPS_IFD_OFFSET];
                metajs.IfdReader.read(
                    dataProvider,
                    headerInfo.ifdOffsetBase,
                    gpsIfdOffset,
                    metajs.gpsTagIdToField,
                    metajs.tiffUndefinedHelpers,
                    function(error, gpsInfo) {
                        if(error) {
                            callback(error);
                            return;
                        }

                        debugger;
                        values.gps = gpsInfo;
                        callback(null, data);
                    }
                );
            }
            else {
                callback(null, data);
            }
        };

        //TODO: Fix flat nested not skipping data field ....
        // Process each section of the file ...
        _$.serial(
            {},
            readHeader,
            readIfd0,
            readSubIfd,
            readExifIfd,
            readGpsIfd,
            function(error) {
                if(error) {
                    //TODO: Error
                    callback(error);
                    debugger;
                    return;
                }
                
                // values
                debugger;

                //TODO: Remove
                var pretty = metajs.prettify(values);
                debugger;

                callback(null, values);
            }
        );
    }
};metajs.friendlyNamesGps = {};

//Can support different languages at some point
metajs.friendlyNamesGps['en-us'] = {

//TODO: Get rid of null terminators;

    altitudeRef: {
        0: 'Sea level',
        1: 'Sea level reference (negative value)'
    },

    destLatitudeRef: {
        'n\0': 'North latitude',
        's\0': 'South latitude'
    },

    imgDirectionRef: {
        't\0': 'True direction',
        'm\0': 'Magnetic direction'
    },

    latitude: function(data) {
        var latitude = data.latitude;

        var output = 
            latitude[0] + '° ' + 
            latitude[1] + '\' ' + 
            latitude[2] + '"';

        if(data.latitudeRef) {
            output += ' ' + data.latitudeRef;
        }
        return output;
    },

    latitudeRef: {
        'n\0': 'North Latitude',
        's\0': 'South Latitude'
    },

    longitude: function(data) {
        var longitude = data.longitude;

        var output = 
            longitude[0] + '° ' + 
            longitude[1] + '\' ' + 
            longitude[2] + '"';

        if(data.longitudeRef) {
            output += ' ' + data.longitudeRef;
        }
        return output;
    },

    longitudeRef: {
        'e\0': 'East longitude',
        'w\0': 'West longitude'
    },

    measureMode: {
        '2\0': '2-dimensional measurement',
        '3\0': '3-dimensional measurement'
    },

    speedRef: {
        'k\0': 'Kilometers per hour',
        'm\0': 'Miles per hour',
        'n\0': 'Knots'
    },

    status: {
        'a\0': 'Measurement in progress',
        'v\0': 'Measurement interoperability'
    }
};//Can support different languages at some point
metajs.friendlyNamesImage = {};

metajs.friendlyNamesImage['en-us'] = {

    compression: {
        1: 'Uncompressed',
        2: 'CCITT1D',
        3: 'T4/Group 3 Fax',
        4: 'T6/Group 4 Fax',
        5: 'LZW',
        6: 'JPEG (old style)',
        7: 'JPEG',
        8: 'Adobe Deflate',
        9: 'JBIG B&W',
        10: 'JBIG Color',
        32766: 'Next',
        32769: 'Epson ERF Compressed',
        32771: 'CCIRLEW',
        32773: 'PackBits',
        32809: 'Thunderscan',
        32895: 'IT8CTPAD',
        32896: 'IT8LW',
        32897: 'IT8MP',
        32898: 'IT8BL',
        32908: 'PixarFilm',
        32909: 'PixarLog',
        32946: 'Deflate',
        32947: 'DCS',
        34661: 'JBIG',
        34676: 'SGILog',
        34677: 'SGILog24',
        34712: 'JPEG 2000',
        34713: 'Nikon NEF Compressed',
        65000: 'Kodak DCR Compressed',
        65535: 'Pentax PEF Compressed'
    },

    orientation: {
        1: 'Horizontal',
        2: 'Mirror Horizontal',
        3: 'Rotate 180',
        4: 'Mirror Vertical',
        5: 'Mirror horizontal and rotate 270 CW',
        6: 'Rotate 90 CW',
        7: 'Mirror horizontal and rotate 90 CW',
        8: 'Rotate 270 CW'
    },

    photometricInterpretation: {
        0: 'WhiteIsZero',
        1: 'BlackIsZero',
        2: 'RGB',
        3: 'RGB Palette',
        4: 'Transparency Mask',
        5: 'CMYK',
        6: 'YCbCr',
        8: 'CIELab',
        9: 'ICCLab',
        10: 'ITULab',
        32803: 'Color Filter Array',
        32844: 'Pixar LogL',
        32845: 'Pixar LogLuv',
        34892: 'Linear Raw'
    },

    planarConfiguration: {
        1: 'Chunky',
        2: 'Planar'
    },

    resolutionUnit: {
        1: 'None',
        2: 'Inches',
        3: 'CM'
    },

    yCbCrPositioning: {
        1: 'Centered',
        2: 'Co-sited'
    },

    //TODO: Test
    yCbCrSubSampling: {
        '1,1': 'YCbCr4:4:4 (1 1)',
        '1,2': 'YCbCr4:4:0 (1 2)',
        '2,1': 'YCbCr4:2:2 (2 1)',
        '2,2': 'YCbCr4:2:0 (2 2)',
        '4,1': 'YCbCr4:1:1 (4 1)',
        '4,2': 'YCbCr4:1:0 (4 2)'
    }
};
metajs.tiffUndefinedHelpers = {

    // exif version
    36864:function(dataReader, numberOfComponents) {
        // stored as an ascii string
        var data = '';
        for(var i=0; i<numberOfComponents; ++i) {
            data += dataReader.getChar();
        }
        return data;
    },
    
    // flashpix version
    40960:function(dataReader, numberOfComponents) {
        // stored as an ascii string
        var data = '';
        for(var i=0; i<numberOfComponents; ++i) {
            data += dataReader.getChar();
        }
        return data;
    },
    
    
    // user comment
    37510: function(dataReader, numberOfComponents) {
        
        var encoding1 = dataReader.getUint8(),
        encoding2 = dataReader.getUint8(),
        encoding3 = dataReader.getUint8(),
        encoding4 = dataReader.getUint8(),
        encoding5 = dataReader.getUint8(),
        encoding6 = dataReader.getUint8(),
        encoding7 = dataReader.getUint8(),
        encoding8 = dataReader.getUint8();

        // Includes character encoding
        var characterCount = numberOfComponents - 8;
        
        if(encoding1 === 0x41 &&
           encoding2 === 0x53 &&
           encoding3 === 0x43 &&
           encoding4 === 0x49 &&
           encoding5 === 0x49 &&
           encoding6 === 0x00 &&
           encoding7 === 0x00 &&
           encoding8 === 0x00) {
            
            // ASCII encoding
            var data = '';
            for(var i=0; i<characterCount; ++i) {
                data += dataReader.getChar();
            }
            return data;
        }
        else if(encoding1 === 0x4A &&
                encoding2 === 0x49 &&
                encoding3 === 0x53 &&
                encoding4 === 0x00 &&
                encoding5 === 0x00 &&
                encoding6 === 0x00 &&
                encoding7 === 0x00 &&
                encoding8 === 0x00) {
            characterCode = CC_JIS;
            // Not supported
            return undefined;
        }
        else if(encoding1 === 0x55 &&
                encoding2 === 0x4e &&
                encoding3 === 0x49 &&
                encoding4 === 0x43 &&
                encoding5 === 0x4f &&
                encoding6 === 0x44 &&
                encoding7 === 0x45 &&
                encoding8 === 0x00) {
            characterCode = CC_UNICODE;
            // Not supported
            return undefined;
        }
        else {
            characterCode = CC_UNDEFINED;
            // Not supported
            return undefined;
        }
    }
};
metajs.IfdReader = function() {
};

metajs.IfdReader.read = function(dataProvider, offsetOrigin, ifdOrigin, 
                                 tagLookupTable, undefinedValueHelpers, callback) {
    
    // Fetch the number of entries in the ifd table
    var getEntryCount = function(_, callback) {
        dataProvider.loadRange({start: ifdOrigin, count: 2}, _$.ce(function(ifdData) {
            var ifdEntryCount = ifdData.getUint16();
            callback(null, ifdEntryCount);
        }));
    };

    // Read each of the entries in the table
    var readEntries = function(entryCount, callback) {

        // Each entry is of the following layout
        // tagId: 2 bytes
        // type: 2 bytes
        // numberOfComponents: 4 bytes
        // data value or offset: 4 bytes

        var bytesToRead = entryCount * (2 + 2 + 4 + 4);
        dataProvider.loadRange({start: ifdOrigin + 2, count: bytesToRead}, _$.ce(function(entriesData) {

            // All of the values read from the ifd entry will be added to the values object
            var values = {};

            function readEntryX(index) {
                var tagId = entriesData.getUint16();
                var dataFormat = entriesData.getUint16();
                var numberOfComponents = entriesData.getUint32();

                readEntry(
                    offsetOrigin, 
                    entriesData, 
                    dataFormat, 
                    numberOfComponents, 
                    tagId, 
                    undefinedValueHelpers,
                    function(error, value) {
                        if(error) {
                            callback(error);
                            return;
                        }

                        var fieldName = tagLookupTable[tagId];
                        if(!fieldName) {
                            fieldName = tagId;
                        }
                        values[fieldName] = value;

                        ++index;
                        if(index >= entryCount) {
                            callback(null, values);
                        }
                        else {
                            setTimeout(function() {
                                readEntryX(index);
                            }, 0);
                        }
                    }
                );                
            }
            readEntryX(0);
        }));
    };

    var readEntry = function(offsetOrigin, entriesData, dataFormat, 
                             numberOfComponents, tagId, undefinedValueHelpers, callback) {
        
        var dataByteLength = metajs.ifdDataFormatByteLength[dataFormat] * numberOfComponents;

        if(dataByteLength <= 4) {
            // can read directly from this location
            var data = parseValueData(entriesData);
            
            // Need to read all 4 bytes if less than 4 bytes, so we move
            // to the beginning of the next entry
            while(dataByteLength < 4) {
                entriesData.getUint8();
                ++dataByteLength;
            }

            callback(null, data);
        }
        else {
            // need to read from an offset
            var valueOffset = entriesData.getUint32();
            dataProvider.loadRange({start:offsetOrigin + valueOffset, count: dataByteLength}, _$.ce(function(dataReader) {
                callback(null, parseValueData(dataReader));
            }));
        }
        
        function parseValueData(dataReader) {
            var data = null;
            var readFn = null;
            
            switch(dataFormat) {
            case metajs.ifdDataFormat.ubyte:
                readFn = function() { return dataReader.getUint8(); };
                break;
                
            case metajs.ifdDataFormat.ascii:
                data = '';
                readFn = function() { return dataReader.getChar(); };
                break;
                
            case metajs.ifdDataFormat.ushort:
                readFn = function() { return dataReader.getUint16(); };
                break;
                
            case metajs.ifdDataFormat.ulong:
                readFn = function() { return dataReader.getUint32(); };
                break;
                
            case metajs.ifdDataFormat.urat:
                readFn = function() {
                    var numerator = dataReader.getUint32();
                    var denominator = dataReader.getUint32();
                    return numerator / denominator;
                };
                break;
                
            case metajs.ifdDataFormat.sbyte:
                readFn = function() { return dataReader.getInt8(); };
                break;
                
            case metajs.ifdDataFormat.sshort:
                readFn = function() { return dataReader.getInt16(); };
                break;
                
            case metajs.ifdDataFormat.undef:
                readFn = function() { return dataReader.getUint8(); };
                break;
                
            case metajs.ifdDataFormat.slong:
                readFn = function() { return dataReader.getInt32(); };
                break;
                
            case metajs.ifdDataFormat.srat:
                readFn = function() {
                    var numerator = dataReader.getInt32();
                    var denominator = dataReader.getInt32();
                    return numerator / denominator;                
                };
            }
            
            // If have data to read, could be a single or multiple values
            // in the case of multiple values we store those in an array
            if(readFn) {
                if(undefinedValueHelpers[tagId]) {
                    data = undefinedValueHelpers[tagId](dataReader, numberOfComponents);
                }
                else {
                    if(numberOfComponents > 1) {
                        var isStringData = (data === '');
                        if(!isStringData) {
                            data = [];
                        }
                        
                        for(var i=0; i<numberOfComponents; ++i) {
                            if(isStringData) {
                                data += readFn();
                            }
                            else {
                                data.push(readFn());
                            }
                        }
                    }
                    else {
                        data = readFn();
                    }
                }
            }
            
            return data;
        }
    };
        
    // Read the number of entries and then read each one and parse
    _$.serial(
        {},
        getEntryCount,
        readEntries,
        function(error, result) {

            debugger;
            if(error) {
                callback(error);
                return;
            }
            callback(null, result);
        }
    );
};}(window));