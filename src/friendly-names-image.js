//Can support different languages at some point
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
