metajs.NefReader = function NefReader() {
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
};