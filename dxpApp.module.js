var module = angular
    .module( 'dxpApp', [ 'ymaps', 'ngSanitize', 'bootstrapLightbox' ] )
    .directive('compile', compileDirective )
    .directive( 'lightboxImage', lightboxImage )
    .factory( 'DataServiceFactory', DataServiceFactory )
    .service( 'Location', Location )
    .service( 'Spots', Spots )
    .service( 'News', News )
    .service( 'Chat', Chat )
    .service( 'Tabs', Tabs )
    .service( 'Log', Log )
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
    return DataServiceFactory( "/rda/spots.json" );
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


function Tabs( Storage ) {
    var storageKey = 'dxpTabsRed';
    var active = 'log';
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
    }

    function toStorage() {
        Storage.save( storageKey, read, 'local' );
    }

    function setActive( value ) { 
        active = value; 
        if ( value == 'map' )
            mapInit = true;
        if ( updated[value] ) {
            read[value] = updated[value];        
            toStorage();
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

function lastQsoController( Log ) {
    var vm = this;
    vm.lastLogEntry = Log.lastEntry;
    vm.logEmpty = Log.isEmpty;
    return vm;
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

function chatController( Chat, $interval, Storage ) {
    DataController.call( this, Chat, 60000, $interval );
    var storageKey = 'dxpChatCS';
    var vm = this;

    vm.cs = Storage.load( storageKey, 'local' );
    vm.send = send;


    return vm;

    function send() {
        Storage.save( storageKey, vm.cs, 'local' );
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

    vm.map = { center: [ 45, 39 ], zoom: 11 };

    return vm;

    function processData() {
        if ( vm.data.location )
            vm.map.center = vm.data.location;
    }

}

