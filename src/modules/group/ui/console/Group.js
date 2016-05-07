/**
 * Created by mark on 2016/04/17.
 */

import Vincent from '../../../../Vincent';
import GroupElement from '../../Group';
import logger from '../../../../Logger';

const _group = Symbol['group'];
const _appUser = Symbol["appUser"];


class Group {

    /*
    The group parameter is either a name or a data structure or an instance of GroupElement.
    GroupElement is used internally.
    The data structure can contain {name:<groupname>,gid:<int>}
    when converting from GroupElement to UI Group data type
     */
    constructor(group,appUser){
        this[_appUser] = appUser;
        if(typeof group ==='string' || (group.name && !group instanceof GroupElement)) {
            this[_group] = new GroupElement(group);
            Vincent.app.provider.managers.groupManager.addValidGroup(this[_group]);
        }else if (group instanceof GroupElement){
            this[_group] = group;
        }
    }

    get gid(){
        return this[_group].gid;
    }

    get name(){
        return this[_group].name;
    }

    set gid(value){
        if (typeof value==='number'){
            VIncent.app.provider.managers.groupManager.updateGroupGid(this[_group],value);
        }else{
            console.log("Gid must be a number");
        }
    }

    get state(){
        return this[_group].state;
    }

    inspect(){
        return {
            name: this.name,
            gid: this.gid? this.gid : "-",
            state: this.state
        };
    }

    toString() {
        return `{ group: ${this.group.name},gid:${this.gid ? this.gid : "-"} }`;
    }


}


export default Group;