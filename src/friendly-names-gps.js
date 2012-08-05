metajs.friendlyNamesGps = {};

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
};