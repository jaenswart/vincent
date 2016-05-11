/**
 * Created by mark on 2016/04/16.
 */

import Vincent from '../../../../Vincent'
import User from "./User"
import PermissionsUIManager from '../../../../ui/PermissionsUIManager';


var data = new WeakMap();

class UserManager extends PermissionsUIManager {

    constructor(appUser) {
        super(appUser,Vincent.app.provider.managers.userManager);
        let obj = {};
        obj.appUser = appUser;
        obj.permObj = Vincent.app.provider.managers.userManager;
        data.set(this,obj);
    }

    list() {
        try {
           return Vincent.app.provider._readAttributeCheck(data.get(this).appUser,data.get(this).permObj,()=> {
              return data.get(this).permObj.validUsers.map((user=> {
                  return user.name;
              }));
          });
        }catch(e){
            console.log(e);
            return [];
        }
    }

    getUser(username) {
        try {
            let user = data.get(this).permObj.findValidUser(username);
            return Vincent.app.provider._readAttributeCheck(data.get(this).appUser,data.get(this).permObj, () => {
                return new User(user, data.get(this).appUser,data.get(this).permObj);
            });
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    addUser(userData) {
        try {
            return Vincent.app.provider._writeAttributeCheck(data.get(this).appUser,data.get(this).permObj, ()=> {
                if (userData && (typeof userData === 'string' || userData.name)) {
                    let user = new User(userData,data.get(this).appUser,this);
                    console.log(`created user ${userData.name? userData.name : userData}`);
                    return user;
                } else {
                    console.log("Parameter must be a username string or a object with mandatory a name and optionally a uid and state property.");
                    return false;
                }
            });
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    save() {
        try {
            return Vincent.app.provider._writeAttributeCheck(data.get(this).appUser,data.get(this).permObj, ()=> {
                return data.get(this).permObj.save();
            });
        } catch (e) {
            console.log(e);
            return false;
        }
    }
    
}

export default UserManager;