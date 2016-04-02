"use strict";

import Host from './Host';
import RemoteAccess from '../../coremodel/hostcomponents/RemoteAccess';
import Provider from '../../Provider';
import logger from '../../Logger';
import Manager from '../base/Manager';

class HostManager extends Manager {

    constructor(provider) {
        if (!provider instanceof Provider) {
            throw new Error("Parameter provider must be an instance of provider");
        }
        super();
        this.provider = provider;
        this.validHosts = [];
        this.errors = {
            manager:[]
        };
    }

    initialiseHost(host){
        //na for host manager
    }

    add(host) {
        if (host instanceof Host) {
            if (this.validHosts.find((cHost)=>{
                        if (cHost.name===host.name){
                            return cHost;
                        }
                })){
                //todo Merge hosts?
                throw new Error("Host already exists in model");
            }else {
                this.validHosts.push(host);
            }
        } else {
            logger.logAndThrow("Parameter host must be of type Host");
        }
    }

    find(hostname) {
        return this.validHosts.find((host)=> {
            if (host.name === hostname) {
                return host;
            }
        });
    }

    /*
    Method to provision a host for the specific engine.
     */
    provisionHostForEngine(initHost){
        if (typeof initHost =='object'){
            if(!initHost.name){
                throw new Error("Initialising a new host requires the initHost object to " +
                    "have a name property.");
            }
            if(!initHost instanceof Host) {
               initHost=this.provider.managers.hostManager.load(initHost);
            }
            let playbook = this.provider.engine.loadEngineDefinition(initHost);
            this.provider.engine.export(playbook);
            //this.provider.database.initHost(host.name).then();
        }else{
            throw new Error("The parameter to init host must be of type Host or " +
                "an HostComponent object");
        }
    }

    loadHosts(hosts) {
        //filter and clean up cloned hosts
        hosts.forEach((hostDef) => {
            try {
                let host = this.loadFromJson(hostDef);
            }
            catch (e) {
                logger.logAndAddToErrors(`Error loading host - ${e.message}`,
                    this.errors.manager);
            }
        });
        return this.validHosts;
    }
    
    loadFromJson(hostDef) {
        
        var hostData = {
            name: hostDef.name
        };
        
        let host = {};

        //create host instance
        try {
            host = new Host(this.provider, hostData);
            this.errors[host.name] = [];
        } catch (e) {
            logger.logAndThrow(e.message);
        }

        //configure remoteAccess settings for host.
        if(hostDef.remoteAccess){
            try {
                let remoteAccessDef = hostDef.remoteAccess;
                let remoteAccess = new RemoteAccess(remoteAccessDef.remoteUser,
                    remoteAccessDef.authentication, remoteAccessDef.sudoAuthentication);
                host.setRemoteAccess(remoteAccess);
            }catch(e){
                logger.logAndAddToErrors(`Error adding remote access user - ${e.message}`,
                    this.errors[host.name]);
            }
        }

        try {
            this.provider.managers.userManager.updateHost(this,host,hostDef);
        }catch(e){
            logger.logAndAddToErrors(`Error loading users - ${e.message}`,
                this.errors[host.name]);
        }

        try {
            this.provider.managers.groupManager.updateHost(this,host,hostDef);
        }catch(e){
            logger.logAndAddToErrors(`Error loading groups - ${e.message}`,
                this.errors[host.name]);
        }

        try {
            this.provider.managers.sshManager.updateHost(this,host,hostDef);
        }catch(e){
            logger.logAndAddToErrors(`Error loading ssh - ${e.message}`,
                this.errors[host.name]);
        }

        host.source = hostDef;
        this.add(host);
        Array.prototype.push.apply(this.errors[host.name], host.errors)
        return host;
    }

    export() {
        var obj = [];
        this.validHosts.forEach((host)=> {
            obj.push(host.export());
        });
        return obj;
    }

    clear() {
        this.validHosts = [];
    }

    findIncludeInDef(name, includes) {
        let inc = includes[name];
        if (inc) {
            return inc;
        } else {
            return;
        }
    }

}

export default HostManager;