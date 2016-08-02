/**
 * Created by mark on 2016/05/01.
 */
import Provider from '../../src/Provider';
import {expect} from 'chai';
import AppUser from '../../src/ui/AppUser';
import HostManagerUI from '../../src/modules/host/ui/console/HostManager';
import Vincent from '../../src/Vincent';
import Session from '../../src/ui/Session';

describe("HostManager UI should", ()=> {


    it("prevent unauthorised users from loading engine definitions for hosts without permissions", (done)=> {
        var provider = new Provider();
        Vincent.app = {provider: provider, converters:new Map()};

        let appUser = new AppUser("newton", ["dev"], "devops");
        let result = "";
        let session = new Session();
        session.appUser = appUser;
        session.console = {
            test: function () {
            },
            outputError: function (msg) {
                result = msg;
            },
            outputWarning: function (msg) {
                result = msg;
            },
            outputSuccess: function (msg) {
                result = msg;
            }
        };
        session.socket = {
            write: ()=> {
            }
        };

        let hostManagerUi = new HostManagerUI(session);
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
            done(e);
        });
    });


    it("allow authorised users to load engine definitions for hosts with permissions", (done)=> {
        let appUser = new AppUser("newton", ["dev"], "devops");
        let result = "";

        let session = new Session();
        session.appUser = appUser;
        session.console = {
            test: function () {
            },
            outputError: function (msg) {
                result = msg;
            },
            outputWarning: function (msg) {
                result = msg;
            },
            outputSuccess: function (msg) {
                result = msg;
            }
        };

        let hostManagerUi = new HostManagerUI(session);
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
        var provider = new Provider();
        Vincent.app = {provider: provider};

        try {
            let appUser = new AppUser("newton", ["dev"], "devops");
            let result = "";
            let session = new Session();
            session.appUser = appUser;
            session.console = {
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                }
            };

            session.socket = {
                write: ()=> {
                }
            };
            let hostManagerUi = new HostManagerUI(session);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            //change host owner
            host.permissions = "700";
            host.group = "einstein";
            host.owner = "einstein";
            var tmpHost = hostManagerUi.getHost("dogzrule.co.za");
            expect(result).to.equal("User newton does not have the required permissions for dogzrule.co.za for the action read attribute.");
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("allow authorised users to obtain a reference to a host", ()=> {
        var provider = new Provider();
        Vincent.app = {provider: provider};

        try {
            Vincent.app.provider.managers.hostManager.validHosts = [];
            let appUser = new AppUser("newton", ["dev"], "devops");
            let result = "";

            let session = new Session();
            session.appUser = appUser;
            session.console = {
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                }
            };

            session.socket = {
                write: ()=> {
                }
            };
            let hostManagerUi2 = new HostManagerUI(session);
            let host = hostManagerUi2.addHost("dogzrule.co.za","unknown", "web");
            let tmpHost = hostManagerUi2.getHost("dogzrule.co.za","web");
            expect(tmpHost).to.deep.equal(host);
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("prevent unauthorised users from saving a host definition", ()=> {
        try {
            let appUser = new AppUser("newton", ["dev"], "devops");
            let session = new Session();
            session.appUser = appUser;
            session.console = {
                test: function () {
                },
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                }
            };

            session.socket = {
                write: ()=> {
                }
            };
            let hostManagerUi = new HostManagerUI(session);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            //change host owner
            host.group = "einstein";
            host.owner = "einstein";
            Vincent.app.provider.managers.hostManager.saveHost = ()=> {
                return true
            };
            let result = hostManagerUi.saveHost("dogzrule.co.za");
            expect(result).to.equal("User newton does not have the required permissions for dogzrule.co.za for the action write attribute.");
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("allow authorised users to save a host definition", ()=> {
        try {
            let appUser = new AppUser("newton", ["dev"], "devops");
            let session = new Session();
            session.appUser = appUser;
            session.console = {
                test: function () {
                },
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                }
            };

            session.socket = {
                write: ()=> {
                }
            };
            let hostManagerUi = new HostManagerUI(session);
            let host = hostManagerUi.addHost("dogzrule.co.za","Debian", "web");
            Vincent.app.provider.managers.hostManager.saveHost = ()=> {
                return true
            };
            let result = hostManagerUi.saveHost("dogzrule.co.za", "web");
            expect(result).to.be.equal("true");
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("only save host definitions to which the appUser has write permissions when invoking saveAll", ()=> {
        try {
            let appUser = new AppUser("newton", ["dev"], "devops");
            let result = "";

            let session = new Session();
            session.appUser = appUser;
            session.console = {
                test: function () {
                },
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                }
            };

            session.socket = {
                write: ()=> {
                }
            };
            let hostManagerUi = new HostManagerUI(session);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            let host2 = hostManagerUi.addHost("locatzsux.co.za");
            host2.group = "einstein";
            host2.permissions = "700";
            host2.owner = "einstein";
            //Vincent.app.provider.managers.hostManager.saveHost = ()=> {
            //    return true
            //};
            let result2 = hostManagerUi.saveHosts();
            expect(result2).to.equal(1);
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("prevent unauthorised users from listing hosts", ()=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"]);
            let result = "";

            let session = new Session();
            session.appUser = appUser;
            session.console = {
                test: function () {
                },
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                }
            };

            session.socket = {
                write: ()=> {
                }
            };
            let hostManagerUi = new HostManagerUI(session);
            let host1 = hostManagerUi.addHost("dogzrule.co.za");
            let host2 = hostManagerUi.addHost("catzsux.co.za");
            host2.group = "einstein";
            host2.owner = "einstein";
            let results = hostManagerUi.list;
            expect(results.keys().next().value).to.equal("default");
            expect(results.get("default")[0].name).to.deep.equal("dogzrule.co.za");
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
            let appUser = new AppUser("newton", ["dev"], "devops");
            let result = "";

            let session = new Session();
            session.appUser = appUser;
            session.console = {
                test: function () {
                },
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                }
            };

            session.socket = {
                write: ()=> {
                }
            };
            let hostManagerUi = new HostManagerUI(session);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            //change host owner
            host.owner = "einstein";
            expect(()=> {
                host.generateDeploymentArtifact()
            }).to.throw("User newton does not have the required permissions for dogzrule.co.za for the action execute attribute.");
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("allow authorised users to load engine definitions", (done)=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"], "dev");
            let result = "";

            let session = new Session();
            session.appUser = appUser;
            session.console = {
                test: function () {
                },
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                    if (result==="Generating configuration files for engine. Please wait...") return;
                    expect(result).to.equal("Successfully generated playbook for dogzrule.co.za.");
                    done();
                }
            };

            session.socket = {
                write: ()=> {
                }
            };
            let hostManagerUi = new HostManagerUI(session);
            let host = hostManagerUi.addHost("dogzrule.co.za");
            //mock out export function
            Vincent.app.provider.engine.export = ()=> {
                return new Promise((resolve)=> {
                    resolve('success');
                });
            };
            host.generateDeploymentArtifact();
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("prevent unauthorised users from reading attributes host", ()=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"]);
            let result = "";

            let session = new Session();
            session.appUser = appUser;
            session.console = {
                test: function () {
                },
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                }
            };

            session.socket = {
                write: ()=> {
                }
            };
            let hostManagerUi = new HostManagerUI(session);
            let host2 = hostManagerUi.addHost("catzsux.co.za");
            host2.group = "einstein";
            host2.owner = "einstein";
            host2.permissins = "700";
            expect(()=> {
                host2.owner
            }).to.throw("User newton does not have the required permissions for catzsux.co.za for the action read attribute.");
            expect(()=> {
                host2.group
            }).to.throw("User newton does not have the required permissions for catzsux.co.za for the action read attribute.");
            expect(()=> {
                host2.permissions
            }).to.throw("User newton does not have the required permissions for catzsux.co.za for the action read attribute.");
            expect(()=> {
                host2.name
            }).to.throw("User newton does not have the required permissions for catzsux.co.za for the action read attribute.");
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("allow authorised users to read attributes of host", ()=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"], "dev");
            let session = new Session();
            session.appUser = appUser;
            session.console = {
                test: function () {
                },
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                }
            };

            session.socket = {
                write: ()=> {
                }
            };
            let hostManagerUi = new HostManagerUI(session);
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
            let session = new Session();
            session.appUser = appUser;
            session.console = {
                test: function () {
                },
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                }
            };

            session.socket = {
                write: ()=> {
                }
            };

            let hostManagerUi = new HostManagerUI(session);
            let host2 = hostManagerUi.addHost("catzsux.co.za");
            host2.owner = "einstein";
            host2.permissions = 700;
            let func = ()=> {
                host2.owner = "newton";
            };
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action write attribute.");
            func = ()=> {
                host2.group = "newton";
            };
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action write attribute.");
            func = ()=> {
                host2.permissions = 770;
            };
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action write attribute.");
            func = ()=> {
                host2.name = "lolcatzsuxmore.co.za";
            };
            expect(func).to.throw("User newton does not have the required permissions for catzsux.co.za for the action write attribute.");
        } finally {
            Vincent.app.provider.managers.hostManager.validHosts = [];
        }
    });


    it("allow authorised users to set attributes of host", ()=> {
        try {
            let appUser = new AppUser("newton", ["devops", "dev"], "dev");
            let result = "";
            let session = new Session();
            session.appUser = appUser;
            session.console = {
                test: function () {
                },
                outputError: function (msg) {
                    result = msg;
                },
                outputWarning: function (msg) {
                    result = msg;
                },
                outputSuccess: function (msg) {
                    result = msg;
                }
            };

            session.socket = {
                write: ()=> {
                }
            };
            let hostManagerUi = new HostManagerUI(session);
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

     it("should allow the retrieval of task objects.", ()=> {
         try {
             var provider = new Provider();
             Vincent.app = {provider: provider, converters:new Map()};
             let appUser = new AppUser("newton", ["devops", "dev"], "dev");
             let result;
             let session = new Session();
             session.appUser = appUser;
             session.console = {
                 outputError: function (msg) {
                     result = msg;
                 },
                 outputWarning: function (msg) {
                     result = msg;
                 },
                 outputSuccess: function (msg) {
                     result = msg;
                 }
             };

             session.socket = {
                 write: ()=> {
                 }
             };
             let context = {};
             Vincent.app.provider.managers.userManager.loadConsoleUIForSession(context,session);
             Vincent.app.provider.managers.groupManager.loadConsoleUIForSession(context,session);
             Vincent.app.provider.managers.sshManager.loadConsoleUIForSession(context,session);
             let hostManagerUi = new HostManagerUI(session);
             let host2 = hostManagerUi.addHost("catzsux.co.za");
             host2.addUserAccount("user1");
             host2.addHostGroup("group1");
             Vincent.app.provider.managers.sshManager.addSsh(Vincent.app.provider.managers.hostManager.findValidHost(host2));
             expect(host2.getTaskObjects().length).to.equal(3);
         } finally {
             Vincent.app.provider.managers.hostManager.validHosts = [];
         }
     });

});