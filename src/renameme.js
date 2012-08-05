
function doit(){
    
    function handleFileSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        
        var files = evt.dataTransfer.files; // FileList object.
        
        // files is a FileList of File objects. List some properties.
        var output = [];
        for (var i = 0, f; f = files[i]; i++) {
            output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
                        f.size, ' bytes, last modified: ',
                        f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
                        '</li>');
        }
        document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
        
        //var reader = new exifjs.JpegReader();
        var reader = new metajs.NefReader();
        reader.read(files[0], function(error) {
            debugger;
        });
    }
    
    function handleDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }
    
    // Setup the dnd listeners.
    var dropZone = document.getElementById('drop_zone');
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileSelect, false);    
}


// Read JPG
// Read PNG
// Read RAW

(function(window) {
    //TODO: If window.exifjs - someone else already
    //took this namespace ... throw error?, noconflict
    var metajs = window.metajs = window.metajs || {};

    //exifjs.read ...
    //checks type of file then gets correct reader

    metajs.prettify = function(data) {

        var prettyData = {};

        function setFriendlyNames(data, friendlyNamesLookupTable) {
            var prettyData = {};

            if(!data) {
                return prettyData;
            }
            
            for(var tagId in data) {
                var value = data[tagId];

                prettyData[tagId] = value;
                
                var friendlyNames = friendlyNamesLookupTable['en-us'][tagId];
                if(friendlyNames) {
                    if(typeof friendlyNames === 'function') {
                        prettyData[tagId] = friendlyNames(data);
                    }
                    else {
                        // Array indexes use toString interprestation for the key
                        var key = value.toString().toLowerCase();
                        var friendlyName = friendlyNames[key];
                        prettyData[tagId] = friendlyName;
                    }
                }
            }

            return prettyData;
        }
        
        prettyData.image = setFriendlyNames(data.image, metajs.friendlyNamesImage);
        //prettyData.exif = setFriendlyNames(data.exif exifjs.friendlyNamesExif);
        prettyData.gps = setFriendlyNames(data.gps, metajs.friendlyNamesGps);

        return prettyData;
    };
}(window));