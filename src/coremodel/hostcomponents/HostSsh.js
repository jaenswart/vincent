/**
 * Created by mark on 2016/02/19.
 */

import HostDef from './HostDef';
import Ssh from './../Ssh';

class HostSsh extends HostDef {

    constructor(host,config) {
        super(host);
        this.data=new Ssh(config);
        this.errors = this.data.errors;
    }

    get ssh(){
        return this.data.data;
    }


}

export default HostSsh;