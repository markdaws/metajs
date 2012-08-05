metajs.JpegReader = function JpegReader() {
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
};