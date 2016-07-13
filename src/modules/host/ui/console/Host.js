/**
 * Created by mark on 2016/04/16.
 */

import HostEntity from '../../Host';
import Vincent from '../../../../Vincent';
import PermissionsUIManager from '../../../../ui/PermissionsUIManager';
import UserAccount from  '../../../user/ui/console/UserAccount';
import logger from '../../../../Logger';
import RemoteAccess from '../../RemoteAccess';

var data = new WeakMap();

class Host extends PermissionsUIManager {

    constructor(host,session,configGroup) {
        if (!(host instanceof HostEntity) && typeof host !=="string"){
            throw new Error("The host parameter must be a host name, or a ui/Host instance.");
        }

        if(!configGroup){
            configGroup="default";
        }

        //if parameter is of type HostElement (real Host) then we assume it is already
        //added to valid host and this is a reconstruction.

        if (typeof host === 'string') {
            host = new HostEntity(Vincent.app.provider, host, session.appUser.name,
                session.appUser.primaryGroup, 760,configGroup);
            Vincent.app.provider.managers.hostManager.addHost(host);
        }
        super(session.appUser, host);
        var obj = {};
        obj.permObj = host;
        obj.appUser = session.appUser;
        obj.session = session;
        data.set(this, obj);
    }

    get remoteUser() {
        return this._readAttributeWrapper(()=> {
            let ra = data.get(this).permObj.remoteAccess;
            if (!ra) {
                return "currentUser";
            } else {
                return data.get(this).permObj.remoteAccess.remoteUser;
            }
        });
    }

    set remoteUser(remoteUser) {
        this._writeAttributeWrapper(()=> {
            let ra = data.get(this).permObj.remoteAccess;
            if (!ra) {
                data.get(this).permObj.remoteAccess = new RemoteAccess(remoteUser);
            } else {
                data.get(this).permObj.remoteAccess.remoteUser = remoteUser;
            }
        });
    }

    get remoteAuth() {
        return this._readAttributeWrapper(()=> {
            let ra = data.get(this).permObj.remoteAccess;
            if (!ra) {
                return "publicKey";
            } else {
                return data.get(this).permObj.remoteAccess.authentication;
            }
        });
    }

    set remoteAuth(remoteAuth) {
        this._writeAttributeWrapper(()=> {
            let ra = data.get(this).permObj.remoteAccess;
            try {
                if (!ra) {
                    data.get(this).permObj.remoteAccess = new RemoteAccess("currentUser", remoteAuth);
                } else {
                    data.get(this).permObj.remoteAccess.authentication = remoteAuth;
                }
            }catch(e){
                return e.message? e.message:e;
            }
        });
    }

    get becomeUser() {
        return this._readAttributeWrapper(()=> {
            let ra = data.get(this).permObj.remoteAccess;
            if (!ra) {
                return false;
            } else {
                return data.get(this).permObj.remoteAccess.becomeUser;
            }
        });
    }

    set becomeUser(becomeUser) {
        this._writeAttributeWrapper(()=> {
            let ra = data.get(this).permObj.remoteAccess;
            try {
                if (!ra) {
                    data.get(this).permObj.remoteAccess = new RemoteAccess("currentUser", "publicKey",becomeUser);
                } else {
                    data.get(this).permObj.remoteAccess.becomeUser = becomeUser;
                }
            }catch(e){
                return e.message? e.message : e;
            }
        });
    }

    get name() {
        return this._readAttributeWrapper(()=> {
            return data.get(this).permObj.name;
        });
    }

    set name(name){
        return this._writeAttributeWrapper(()=>{
            data.get(this).permObj.name = name;
        });
    }

    get owner() {
        return this._readAttributeWrapper(()=> {
            return data.get(this).permObj.owner;
        });
    }

    set owner(owner) {
            this._writeAttributeWrapper(()=> {
                data.get(this).permObj.owner = owner;
            });
    }

    get configGroup() {
        return this._readAttributeWrapper(()=> {
            return data.get(this).permObj.configGroup;
        });
    }

    set configGroup(configGroup){
        return this._writeAttributeWrapper(()=>{
           data.get(this).permObj.configGroup = configGroup;
        });
    }

    get group() {
        return this._readAttributeWrapper(()=> {
            return data.get(this).permObj.group;
        });
    }

    set group(group) {
        this._writeAttributeWrapper(()=> {
            data.get(this).permObj.group = group;
        });
    }

    get permissions() {
        return this._readAttributeWrapper(()=> {
            return data.get(this).permObj.permissions.toString(8);
        });
    }

    set permissions(perms) {
        this._writeAttributeWrapper(()=> {
            data.get(this).permObj.permissions = perms;
        });
    }

    inspect() {
        try {
            return Vincent.app.provider._readAttributeCheck(data.get(this).appUser, data.get(this).permObj, ()=> {
                return {
                    name: data.get(this).permObj.name,
                    configGroup: data.get(this).permObj.name,
                    owner: data.get(this).permObj.owner,
                    group: data.get(this).permObj.group,
                    permissions: data.get(this).permObj.permissions.toString(8),
                };
            });
        } catch (e) {
            console.log(e);
            return  "Permission denied"
        }
    }

    toString() {
        Vincent.app.provider._readAttributeCheck(data.get(this).appUser, data.get(this).permObj, ()=> {
            return `{ name: ${this.name} }`;
        });
    }

    save() {
        return Vincent.app.provider._executeAttributeCheck(data.get(this).appUser, data.get(this).permObj, ()=> {
            let result = Vincent.app.provider.managers.hostManager.saveHost(data.get(this).permObj);
            return result;
        });
    }

    generatePlaybook() {
        return Vincent.app.provider._executeAttributeCheck(data.get(this).appUser, data.get(this).permObj, ()=> {
            try {
                return Vincent.app.provider.engine.export(data.get(this).permObj).then((result)=> {
                    if (result == "success") {
                        return`Successfully generated playbook for ${data.get(this).permObj.name}.`;
                    }else{
                        resolve(`Failed to generate playbook for ${data.get(this).permObj.name}.`);
                    }
                });
            } catch (e) {
                return `There was an error generating playbook for ${data.get(this).permObj.name} - ${e.message ? e.message : e}`;
            }
        });
    }

    runPlaybook() {
        let remoteUsername;
        let privateKeyPath;
        //let sudoAuthentication=false;
        let password;
        let sudoPassword;
        let checkHostKey = Vincent.app.configGroup.get("checkhostkey");
        if(!checkHostKey){
            checkHostKey = true;
        } else if(!Object.isBoolean(checkHostKey)){
            checkHostKey = false;
        }
        let host = data.get(this).permObj;
        //username, checkhostkey, privkeyPath, passwd, sudoPasswd
        return Vincent.app.provider._executeAttributeCheck(data.get(this).appUser,host, ()=> {
            try {
                data.get(this).session.socket.write(`${host.name} playbook has been submitted. Results will be available shortly.`);
                //If remote access is not defined on the host then use public key
                if(!host.remoteAccess){
                    remoteUsername = data.get(this).appUser.name;
                    privateKeyPath = data.get(this).appUser.privateKeyPath;
                }else {
                    //get username for remote user from host declaration
                    remoteUsername = data.get(this).permObj.remoteAccess.user;
                    //determine authentication type from remote access definition
                    if(host.remoteAccess.authentication=="password"){
                        password = data.get(this).session.password[host.name];
                        if (!password){
                            return `Host ${host.name} uses password authentication but no password has been set.`
                             +`Please set your password with ".password ${hostname}".`
                        }
                    }else{
                        privateKeyPath = data.get(this).appUser.privateKeyPath;
                    }
                    //determine if there is a SUDO password
                    if(host.remoteAccess.sudoAuthentication){
                        sudoPassword = data.get(this).session.password[host.name] ;
                    }
                   //try running playbook
                    Vincent.app.provider.engine.runPlaybook(checkHostKey, privateKeyPath,
                        remoteUsername, password, sudoPassword).then((results)=> {
                        return `Results for ${data.get(this).permObj.name}. - ${results}`;
                    }).catch((e)=> {
                        return `There was an error running playbook for ${data.get(this).permObj.name} - ${e.message ? e.message : e}`;
                    });
                }
            } catch (e) {
                return `There was an error running playbook for ${data.get(this).permObj.name} - ${e.message ? e.message : e}`;
            }
        });
    }

    _readAttributeWrapper(func) {
        try {
            return Vincent.app.provider._readAttributeCheck(data.get(this).appUser, data.get(this).permObj, func);
        } catch (e) {
            return e.message;
        }
    }

    _writeAttributeWrapper(func) {
            return Vincent.app.provider._writeAttributeCheck(data.get(this).appUser, data.get(this).permObj, func);
    }

}

export default Host;