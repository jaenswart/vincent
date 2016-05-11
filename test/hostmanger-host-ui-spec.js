/**
 * Created by mark on 2016/05/01.
 */
import Provider from '../src/Provider';
import {expect} from 'chai';
import AppUser from '../src/ui/AppUser';
import HostUI from '../src/modules/host/ui/console/Host';
import HostManagerUI from '../src/modules/host/ui/console/HostManager';
import Vincent from '../src/Vincent';

describe("HostManager UI should", ()=> {

    var provider = new Provider();
    Vincent.app = {provider: provider};

    it("prevent unauthorised users from loading engine definitions for hosts without permissions", (done)=> {
        let appUser = new AppUser("newton", ["dev"], "devops",);
        let hostManagerUi = new HostManagerUI(appUser);
        let host = hostManagerUi.addHost("dogzrule.co.za");
        //change host owner
        host.owner = "einstein";
        Vincent.app.provider.engine.export = new Promise((resolve)=> {
            return true
        });
        hostManagerUi.generatePlaybooks().then((results)=> {
            Vincent.app.provider.managers.hostManager.validHosts = [];
            expect(results).to.equal(0);
            done();
        }).catch((e)=> {
            Vincent.app.provider.managers.hostManager.validHosts = [];
            console.log("here2");
            done(e);
        });
    });


    it("allow authorised users to load engine definitions for hosts with permissions", (done)=> {
        let appUser = new AppUser("newton", ["dev"], "devops",);
        let hostManagerUi = new HostManagerUI(appUser);
        let host = hostManagerUi.addHost("dogzrule.co.za");
        //change host owner
        hostManagerUi.generatePlaybooks().then((results)=> {
            expect(results).to.equal(1);
            Vincent.app.provider.managers.hostManager.validHosts = [];
            done();
        }).catch((e)=> {
            Vincent.app.provider.managers.hostManager.validHosts = [];
            done();
        });
    });

    it("prevent unauthorised users from obtaining a reference to a host", ()=> {
        try {
            let appUser = new AppUser("newton", ["dev"], "devops",);
            let hostManagerUi = new HostManagerUI(appUser);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            //change host owner
            host.owner = "einstein";
            host.group="einstein";
            var tmpHost = hostManagerUi.getHost("dogzrule.co.za");
            expect(tmpHost).to.be.false;
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("allow authorised users to obtain a reference to a host", ()=> {
        try {
            let appUser = new AppUser("newton", ["dev"], "devops",);
            let hostManagerUi = new HostManagerUI(appUser);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            let tmpHost = hostManagerUi.getHost("dogzrule.co.za");
            expect(tmpHost).to.deep.equal(host);
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("prevent unauthorised users from saving a host definition", ()=> {
        try {
            let appUser = new AppUser("newton", ["dev"], "devops",);
            let hostManagerUi = new HostManagerUI(appUser);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            //change host owner
            host.group="einstein";
            host.owner = "einstein";
            Vincent.app.provider.managers.hostManager.saveHost = ()=> {
                return true
            };
            let result= hostManagerUi.saveHost("dogzrule.co.za");
            expect(result).to.false;
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("allow authorised users to save a host definition", ()=> {
        try {
            let appUser = new AppUser("newton", ["dev"], "devops",);
            let hostManagerUi = new HostManagerUI(appUser);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            Vincent.app.provider.managers.hostManager.saveHost = ()=> {
                return true
            };
            let result = hostManagerUi.saveHost("dogzrule.co.za");
            expect(result).to.be.true;
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("only save host definitions to which the appUser has write permissions when invoking saveAll", ()=> {
        try {
            let appUser = new AppUser("newton", ["dev"], "devops",);
            let hostManagerUi = new HostManagerUI(appUser);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            let host2 = hostManagerUi.addHost("locatzsux.co.za");
            host2.owner="einstein";
            host2.group="einstein";
            Vincent.app.provider.managers.hostManager.saveHost = ()=> {
                return true
            };
            let result = hostManagerUi.saveHosts();
            expect(result).to.equal(1);
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("prevent unauthorised users from listing hosts", ()=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"]);
            let hostManagerUi = new HostManagerUI(appUser);
            let host1 = hostManagerUi.addHost("dogzrule.co.za");
            let host2 = hostManagerUi.addHost("catzsux.co.za");
            host2.group = "einstein";
            host2.owner = "einstein";
            let results = hostManagerUi.list();
            expect(results.length).to.equal(1);
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });




});


describe("Host UI should", ()=> {

    var provider = new Provider();
    Vincent.app = {provider: provider};

    it("prevent unauthorised users from loading engine definitions", ()=> {

        try {
            let appUser = new AppUser("newton", ["dev"], "devops",);
            let hostManagerUi = new HostManagerUI(appUser);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            //change host owner
            host.owner = "einstein";
            let func = ()=> {
                host.generatePlaybook();
            };
            expect(func).to.throw("User newton does not have the required permissions for dogzrule.co.za for the action execute attribute.");
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("allow authorised users to load engine definitions", ()=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"], "dev");
            let hostManagerUi = new HostManagerUI(appUser);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            //mock out export function
            Vincent.app.provider.engine.export = ()=> {
            };
            let func = ()=> {
                host.generatePlaybook();
            };
            expect(func).to.not.throw();
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("prevent unauthorised users from reading attributes host", ()=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"]);
            let hostManagerUi = new HostManagerUI(appUser);
            let host2 = hostManagerUi.addHost("catzsux.co.za");
            host2.group = "einstein";
            host2.owner = "einstein";
            let func = ()=> {
                host2.owner;
            }
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action read attribute.");
            func = ()=> {
                host2.group;
            }
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action read attribute.");
            func = ()=> {
                host2.permissions;
            }
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action read attribute.");
            func = ()=> {
                host2.name;
            }
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action read attribute.");


        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("allow authorised users to read attributes of host", ()=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"], "dev");
            let hostManagerUi = new HostManagerUI(appUser);
            let host2 = hostManagerUi.addHost("catzsux.co.za");
            expect(host2.owner).to.equal("newton");
            expect(host2.group).to.equal("dev");
            expect(host2.permissions.toString(8)).to.equal("760");
            expect(host2.name).to.equal("catzsux.co.za");
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("prevent unauthorised users from writing attributes of host", ()=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"]);
            let hostManagerUi = new HostManagerUI(appUser);
            let host2 = hostManagerUi.addHost("catzsux.co.za");
            host2.owner = "einstein";
            host2.permissions = 700;
            let func = ()=> {
                host2.owner = "newton";
            }
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action write attribute.");
            func = ()=> {
                host2.group = "newton";
            }
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action write attribute.");
            func = ()=> {
                host2.permissions = 770;
            }
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action write attribute.");
            func = ()=> {
                host2.name = "lolcatzsuxmore.co.za";
            }
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action write attribute.");


        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("allow authorised users to set attributes of host", ()=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"], "dev");
            let hostManagerUi = new HostManagerUI(appUser);
            let host2 = hostManagerUi.addHost("catzsux.co.za");
            host2.group = "test1";
            host2.permissions = 777;
            host2.owner = "einstein";
            expect(host2.owner).to.equal("einstein");
            expect(host2.group).to.equal("test1");
            expect(host2.permissions.toString(8)).to.equal("777");
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });

    it("prevent changes to host name", ()=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"], "dev");
            let hostManagerUi = new HostManagerUI(appUser);
            let host2 = hostManagerUi.addHost("catzsux.co.za");
            let func = ()=> {
                host2.name = "changenamenotallowed.co.za";
            };
            expect(func).to.throw("Cannot set property name of #<Host> which has only a getter");
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });

});