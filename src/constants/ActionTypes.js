'use strict';

import keyMirror from 'react/lib/keyMirror';

var ActionTypes = keyMirror({
    LOAD_HOMEPAGE: null,
    LOAD_HOMEPAGE_SUCCESS: null,
    LOAD_HOMEPAGE_ERROR: null,

    LOAD_HOOMS: null,
    LOAD_HOOMS_SUCCESS: null,
    LOAD_HOOMS_ERROR: null
});

module.exports = ActionTypes;
