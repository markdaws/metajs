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
