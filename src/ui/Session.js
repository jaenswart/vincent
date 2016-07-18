/**
 * Created by mark on 2016/04/16.
 */

import {logger} from '../Logger';

class Session {

    constructor() {
        this.authenticated = false;
    }

    set socket(s){
        this._socket =s;
    }
    
    get socket(){
       return this._socket;
    }

}

export default Session;