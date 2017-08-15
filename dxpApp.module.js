var module = angular
    .module( 'dxpApp', [ 'yaMap', 'ngSanitize', 'bootstrapLightbox' ] )
    .directive('compile', compileDirective )
    .directive( 'lightboxImage', lightboxImage )
    .factory( 'DataServiceFactory', DataServiceFactory )
    .service( 'Location', Location )
    .service( 'Spots', Spots )
    .service( 'News', News )
    .service( 'Chat', Chat )
    .service( 'Tabs', Tabs )
    .service( 'Log', Log )
    .service( 'Users', Users )
    .controller( 'statusController', statusController )
    .controller( 'newsController', newsController )
    .controller( 'spotsController', spotsController )
    .controller( 'mapController', mapController ) 
    .controller( 'lastQsoController', lastQsoController )
    .controller( 'tabsController', tabsController )
    .controller( 'checkController', checkController )
    .controller( 'logController', logController )
    .controller( 'chatController', chatController ) 
   ;


function compileDirective($compile) {
    return function(scope, element, attrs) {
        scope.$watch(
            function(scope) {
                // watch the 'compile' expression for changes
                return scope.$eval(attrs.compile);
            },
            function(value) {
                // when the 'compile' expression changes
                // assign it into the current DOM
                element.html(value);

                // compile the new DOM and link it to the current
                // scope.
                // NOTE: we only compile .childNodes so that
                // we don't get into infinite loop compiling ourselves
                $compile(element.contents())(scope);
            }
        );
    };
}

function lightboxImage( Lightbox ) {
    return {
        restrict: 'E',
        scope: {
            image: '@',
            thumb: '@'
        },
        controller: lightboxController,
        controllerAs: 'vm',
        templateUrl: 'lightboxImage.html',
        bindToController: true
    };

    function lightboxController() {
        var vm = this;
        vm.openLightbox = openLightbox;

        return vm;

        function openLightbox() {
            Lightbox.openModal( [{url: vm.image}], 0 );
        }
    }
}

function DataController( DataService, interval, $interval ) {
    var vm = this;
    vm.processData = function() {};
    vm.load = load;
    load();
    $interval( load, 60000 );
    
    
    function load() {
        DataService.load()
            .then( function( data ) {
                    if ( data ) {
                        vm.data = data;
                        vm.processData();
                    }
                });
    }


}

function Location( DataServiceFactory ) {
    return DataServiceFactory( "/rda/location.json" );
}

function Spots( DataServiceFactory ) {
    var s =  DataServiceFactory( "/rda/spots.json" );
    s.processData = processData;
    return s;

    function processData() {
        s.data.forEach( function( item ) {
            if ( item.awards.RDA && 
                    item.text.indexOf( item.awards.RDA.value ) == -1 )
                item.text += ' RDA ' + item.awards.RDA.value;
            if ( item.cs.indexOf( 'R7AB' ) != -1 )
                item.highlight = true;
        });
    }

}

function Log( DataServiceFactory, Tabs, $timeout ) {
    var s = DataServiceFactory( "/rda/qso.json" );
    var empty = true;
    s.lastEntry = lastEntry;
    s.isEmpty = isEmpty;
    s.processData = processData;
    s.tab = 'log';
    s.prev = null;

    return s;

    function lastEntry() {
        if ( s.data && s.data.length > 0 )
            return s.data[0];
        else
            return null;
    }

    function isEmpty() {
        return empty;
    }

    function processData() {
        empty = ( s.data == null ) || ( s.data.length == 0 );
        var n = s.prev != null;
        var nItems = [];
        s.data.forEach( function( item ) {
            if ( item.freq.indexOf( '.' ) == -1 )
                item.freq /= 100;
            if ( n && (s.prev.date != item.date || s.prev.time != 
                    item.time || s.prev.cs != item.cs )) {
                item.new = true;
                nItems.push( item );
            } else
                n = false;
        });
        $timeout( function() {
            nItems.forEach( function( item ) { item.new = false; } );
        }, 5000 );
        s.prev = s.data[0];
    }
}


function Tabs( Storage, $rootScope ) {
    var storageKey = 'dxpTabsRed';
    var active = null;
    var mapInit = false;
    var watch = [ 'news', 'log', 'chat' ];
    var read = null;
    var updated = {};

    init();

    return {
        active: function() { return active; },
        setActive: setActive,
        mapInit: function() { return mapInit; },
        setUpdated: setUpdated,
        unread: unread
    };

    function init() {
        read = Storage.load( storageKey, 'local' );
        if (!read)
            read = {};
        watch.forEach( function(item) {
            updated[item] = null;
            if ( !(item in read) ) 
                read[item] = null;
        });
        setActive( 'log' );
    }

    function toStorage() {
        Storage.save( storageKey, read, 'local' );
    }

    function setActive( value ) { 
        if ( active != value ) {
            active = value; 
            if ( value == 'map' )
                mapInit = true;
            if ( updated[value] ) {
                read[value] = updated[value];        
                toStorage();
            }
            $rootScope.$emit( 'tabSwitch' );
        }
    }

    function setUpdated( type, value ) {
        if ( type in updated ) {
            updated[type] = value;
            if ( active == type ) {
                read[type] = value;
                toStorage();
            }
        }
    }

    function unread( type ) {
        if ( updated[type] )
            return read[type] != updated[type];
        else
            return false;
    }
}

function DataServiceFactory( $http, Tabs ) {
    return createDataService;

    function createDataService( url ) {
        var s = { lm: null,
            load: load,
            data: null,
            url: url,
            tab: null,
            processData: function() {} 
        };
        return s;

        function load() {
            return $http.get( s.url )
                .then( loadComplete )
                .catch( loadFailed );
        }

        function loadComplete( response ) {
            if ( ( s.lm == null || s.lm != response.headers( 'last-modified' ) ) && 
                    response.data ) {
                s.lm = response.headers( 'last-modified' ); 
                s.data = response.data;
                s.processData();
                if (s.tab)
                    Tabs.setUpdated( s.tab, s.lm );
                return s.data;
            } else
                return false;
        }

        function loadFailed( error ) {
            console.log( s.url + ' XHR failed: ' + error.data );
        }
    }
}

function News( DataServiceFactory, Tabs ) {
    var s = DataServiceFactory(  "/rda/news.json" );
    s.tab = 'news';
    return s;
}

function Chat( DataServiceFactory, $http, Tabs ) {
    var s = DataServiceFactory(  "/rda/chat.json" );
    var sendURL = "/dxped/uwsgi/chat";
    s.tab = 'chat';
    s.send = send;

    return s;

    function send( data ) {
        return $http.post( sendURL, data )
            .catch( sendFailed );
    }

    function sendFailed( error ) {
        console.log( sendURL + ' XHR failed: ' + error.data );
    }


}

function Users( DataServiceFactory, Storage, $http, $rootScope, Tabs, $interval ) {
    var s = DataServiceFactory(  "/rda/users.json" );
    var sendURL = "/dxped/uwsgi/users";
    var storageKey = 'dxpChatCS';
    var users = [];
    s.cs = Storage.load( storageKey, 'local' );
    s.send = send;
    s.setCS = setCS;
    s.processData = processData;
    s.users = function() { return users; };
    $rootScope.$on( 'tabSwitch', sendTab );
    sendTab();
    $interval( sendTab, 60000 );
    s.load();
    $interval( s.load, 1000 );

    return s;

    function sendTab() {
        send( { 'tab': Tabs.active() } );
    }

    function processData() {
        users = [];
        var ts = Math.floor(Date.now() / 1000);
        for ( var cs in s.data )
            if ( s.data[cs].ts != null && ts - s.data[cs].ts < 60 )
                users.push( { cs: cs, tab: s.data[cs].tab } );
        users.sort( function( a, b ) {
            if ( a.cs < b.cs )
                return -1;
            if ( a.cs > b.cs )
                return 1;
            if ( a.cs == b.cs )
                return 0;
        } );
    }


    function setCS( cs ) {
        if ( s != s.cs ) {
            send( { 'delete': 1 } );
            s.cs = cs;
            Storage.save( storageKey, s.cs, 'local' );
            sendTab();
        }
    }
   
    function send( data ) {
        if ( s.cs ) {
            data.cs = s.cs;
            return $http.post( sendURL, data )
                .catch( sendFailed );
        }
    }

    function sendFailed( error ) {
        console.log( sendURL + ' XHR failed: ' + error.data );
    }

}


function newsController( News, $interval ) {
    DataController.call( this, News, 60000, $interval );
    var vm = this;
    return vm;

}

function tabsController( Tabs ) {
    var vm = this;
    vm.active = Tabs.active;
    vm.setActive = Tabs.setActive;
    vm.mapInit = Tabs.mapInit;
    vm.unread = Tabs.unread;
    return vm;
}

function logController( Log, $interval ) {
    DataController.call( this, Log, 60000, $interval );
    var vm = this;
    vm.lastLogEntry = Log.lastEntry;
    vm.logEmpty = Log.isEmpty;
    return vm;
}

function lastQsoController( Log, Location ) {
    var vm = this;
    vm.lastLogEntry = Log.lastEntry;
    vm.logEmpty = Log.isEmpty;
    vm.location = getLocationData; 
    return vm;

    function getLocationData() {
        return Location.data;
    }
}

function statusController( Location, $interval ) {
    var vm = this;
    vm.online = false;
    check();
    $interval( check, 1000 );
    return vm;

    function check() {
        if ( Location.data && Location.data.ts ) 
            vm.online = Math.floor(Date.now() / 1000) - Location.data.ts < 300;
        else
            vm.online = false;
    }

}

function chatController( Chat, $interval, Users ) {
    DataController.call( this, Chat, 60000, $interval );
    var vm = this;

    vm.cs = Users.cs;
    vm.send = send;
    vm.users = Users.users;


    return vm;

    function send() {
        Users.setCS( vm.cs );
        if ( vm.text )
            Chat.send( { cs: vm.cs, text: vm.text } )
                .then( sendComplete )
                .catch( sendFailed );
    }

    function sendComplete() {
        vm.text = "";
        vm.load();
    }

    function sendFailed( error ) {
        window.alert( "Sorry, there was an error. Please try again later" );
    }
  
}

function checkController( Log ) {
    var vm = this;
    vm.check = check;
    return vm;

    function check() {
        vm.cs = vm.cs.toUpperCase();
        if ( Log.data ) {
            vm.found = Log.data.filter( function( item ) {
                return item.cs == vm.cs; 
            });
            if ( vm.found.length == 0 )
                vm.found = false;
        } else
            vm.found = false;
    }

}


function spotsController( Spots, $interval ) {
    DataController.call( this, Spots, 60000, $interval );
    return this;
}

function mapController( Location, $interval ) {
    DataController.call( this, Location, 60000, $interval );
    var vm = this;
    vm.processData = processData;

    vm.center = [39.0099183333333, 45.1228633333333 ];
    vm.afterMapInit = afterMapInit;

    return vm;

    function processData() {
        if ( vm.data.location ) {
            setCenter();
            vm.currentLocation = {
                geometry: {
                    type: "Point",
                    coordinates: [vm.data.location[1], vm.data.location[0]]
                },
                // Свойства.
                properties: {
                    balloonContent: vm.data.date + ' ' + vm.data.time + '<br/>' +
                        ' speed: ' + vm.data.speed.toFixed( 1 ) + ' km/h'
                }
            } 
        } else
            vm.currentLocation = null;
    }

    function afterMapInit( map ) {
        vm.map = map;
        setCenter();
        var gpx = ymaps.geoXml.load("http://73.ru/rda/route.xml?v=0.0.0.4")
            .then( function (res) {
/*                res.geoObjects.each( function( o ) {
                    if ( o.geometry && o.geometry.getType() == 'Point' )
                        o.options.set( 'iconColor', '#ff0000' );
                });*/
                map.geoObjects.add(res.geoObjects);
            }, function (err) {
                    console.log('Ошибка: ' + err);}
            );
    }

    function setCenter() {
        if (vm.map && vm.currentLocation) 
            vm.map.setCenter( vm.currentLocation.geometry.coordinates );
    }

}

