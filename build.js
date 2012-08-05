//var jake = require('jake');
//var read = require('file').read;
//var write = require('file').write;

var fs = require('fs');

desc('Create metajs.js file');
file(
    'metajs.js',
    [
        'src/start.js',
        'src/flatnested.js',
        'src/jdataview.js',
        'src/data-provider.js',
        'src/ifd-data-format.js',
        'src/ifd-data-format-byte-length.js',
        'src/image-tagid-to-field.js',
        'src/exif-tagid-to-field.js',
        'src/gps-tagid-to-field.js',
        'src/jpeg-reader.js',
        'src/nef-reader.js',
        'src/friendly-names-gps.js',
        'src/friendly-names-image.js',
        'src/tiff-undefined-helpers.js',
        'src/ifd-reader.js',
        'src/end.js'
    ],
    function() {
        fs.writeFileSync(
            'metajs.js',
            fs.readFileSync('src/start.js') +
            fs.readFileSync('src/flatnested.js') +
            fs.readFileSync('src/jdataview.js') +
            fs.readFileSync('src/data-provider.js') +
            fs.readFileSync('src/ifd-data-format.js') + 
            fs.readFileSync('src/ifd-data-format-byte-length.js') +
            fs.readFileSync('src/image-tagid-to-field.js') +
            fs.readFileSync('src/exif-tagid-to-field.js') +
            fs.readFileSync('src/gps-tagid-to-field.js') +
            fs.readFileSync('src/jpeg-reader.js') +
            fs.readFileSync('src/nef-reader.js') +
            fs.readFileSync('src/friendly-names-gps.js') +
            fs.readFileSync('src/friendly-names-image.js') +
            fs.readFileSync('src/tiff-undefined-helpers.js') +
            fs.readFileSync('src/ifd-reader.js') +
            fs.readFileSync('src/end.js')
        );
    }
);