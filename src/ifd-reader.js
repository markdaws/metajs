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
};