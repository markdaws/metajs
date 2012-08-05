function JpegReader() {
}

JpegReader.prototype = {
    read: function(file, callback) {

        var self = this;
        var reader = new FileReader();
        reader.onerror = function(error) {
        };
        reader.onloadend = function(evt) {

            debugger;
            var x = new jDataView(evt.target.result);

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
        var data = BinaryReader.fromBinaryString(binaryString, true, 0);

        //SOI marker 0xFFD8
        if(data.readByte() !== 0xff ||
           data.readByte() !== 0xd8) {
            callback && callback('Invalid SOI marker');
        }

        //Search for EXIF app marker 0xFFE1
        while(true) {
            
            //valid markers between FFE0 and FFEE
            var markerByte0 = data.readByte();
            var markerByte1 = data.readByte();
            
            if(markerByte0 === 0xff && markerByte1 === 0xe1) {
                //Found exif tag, APP1 marker
                this._readExif(data);
                break;
            }
            else if(markerByte0 === 0xff && markerByte1 < 0xef) {
                //move to next marker, length also includes the size bytes, so sub 2
                var length = data.readUShort() - 2;
                data.skip(length);
            }
            else {
                // not a marker, abort
                break;
                debugger;
            }
        }
    },

    _readExif: function(exifData) {

        var exifLength = exifData.readUShort();

        // Check really is EXIF
        if(exifData.readChar() !== 'E' ||
           exifData.readChar() !== 'x' ||
           exifData.readChar() !== 'i' ||
           exifData.readChar() !== 'f') {
            return null;
           }

        // Two bytes of 0x00
        exifData.skip(2);

        var isBigEndian;

        // TIFF header - 8 bytes
        var tiffStartOffset = exifData.getOffset();
        var tiffByte0 = exifData.readByte();
        var tiffByte1 = exifData.readByte();
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
        exifData.skip(6);

        exifData.setIsBigEndian(isBigEndian);

        var values = { 
            image: {},
            exif: {},
            gps: {}
        };

        var ifdDataReader = function(tiffHeaderOrigin, dataReader, dataFormat, 
                                     numberOfComponents, tagId, undefinedHelpers) {
            var dataByteLength = exifjs.ifdDataFormatByteLength[dataFormat] * numberOfComponents;

            var originalOffset = dataReader.getOffset();
            if(dataByteLength <= 4) {
                // can read directly from this location
            }
            else {
                // need to read from an offset
                var offset = dataReader.readULong();
                dataReader.setOffset(tiffHeaderOrigin + offset);
            }

            var data;
            var readFn = null;

            switch(dataFormat) {
            case exifjs.ifdDataFormat.ubyte:
                //TODO: signed / unsigned??

                readFn = function() { return dataReader.readByte(); };
                break;

            case exifjs.ifdDataFormat.ascii:
                data = '';
                for(var i=0; i<numberOfComponents; ++i) {
                    data += dataReader.readChar();
                }
                break;

            case exifjs.ifdDataFormat.ushort:
                readFn = function() { return dataReader.readUShort(); };
                break;

            case exifjs.ifdDataFormat.ulong:
                readFn = function() { return dataReader.readULong(); };
                break;

            case exifjs.ifdDataFormat.urat:
                readFn = function() {
                    var numerator = dataReader.readULong();
                    var denominator = dataReader.readULong();
                    return numerator / denominator;
                };
                break;

            case exifjs.ifdDataFormat.sbyte:
                //TODO: signed/unsigned??
                readFn = function() { return dataReader.readByte(); };
                break;

            case exifjs.ifdDataFormat.sshort:
                //TODO: signed??
                readFn = function() { return dataReader.readUShort(); };
                break;

            case exifjs.ifdDataFormat.undef:
                readFn = function() { return dataReader.readByte(); };
                break;

            case exifjs.ifdDataFormat.slong:
                //TODO: Signed
                readFn = function() { return dataReader.readULong(); };
                break;

            case exifjs.ifdDataFormat.srat:
                //TODO: Signed
                readFn = function() {
                    var numerator = dataReader.readULong();
                    var denominator = dataReader.readULong();
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
            dataReader.setOffset(originalOffset + 4);
            return data;
        };

        // For data that has an undefined type, these helpers know how to
        // process the data
        var undefinedHelpers = {

            // user comment
            37510: function(dataReader, numberOfComponents) {

                var encoding1 = dataReader.readByte(),
                    encoding2 = dataReader.readByte(),
                    encoding3 = dataReader.readByte(),
                    encoding4 = dataReader.readByte(),
                    encoding5 = dataReader.readByte(),
                    encoding6 = dataReader.readByte(),
                    encoding7 = dataReader.readByte(),
                    encoding8 = dataReader.readByte();

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
                        data += dataReader.readChar();
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
            var ifdEntryCount = exifData.readUShort();
            for(var i=0; i<ifdEntryCount; ++i) {
                var tagId = exifData.readUShort();
                console.log(tagId);
                
                var type = exifData.readUShort();
                console.log(type);
                
                var numberOfComponents = exifData.readULong();
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
            exifData.setOffset(exifIfdOffset);
            var exifInfo = readIfdBlock(exifData, exifjs.exifTagIdToField);
            values.exif = exifInfo;
            delete imageInfo[EXIF_IFD_OFFSET];
        }
            
        var GPS_IFD_POINTER = 34853;
        if(values[GPS_IFD_POINTER]) {
            // GPS IFD pointer
            // TODO:
            debugger;
            console.log('found GPS IFD pointer');
            
            delete values[GPS_IFD_POINTER];
        }
        
        var INTEROP_IFD_POINTER = 40965;
        if(values[INTEROP_IFD_POINTER]) {
            // Interoperability IFD pointer
            // TODO:
            debugger;
            console.log('found interoperability ifd pointer');

            delete values[INTEROP_IFD_POINTER];
        }




        // Now in First IFD block (Image File Directory)
        
        debugger;
        var pretty = exifjs.prettify(values);
        return values;
    }
};