/*
  Gemeinsamer Kern für Website (index.html) und Theken-Kalender (reservierungen.html).
  DEMO: Die Reservierungen liegen im localStorage des Browsers. Beide Seiten müssen
  im selben Browser geöffnet sein. Die echte Version speichert auf einem Server.
  Tische und Platzzahlen sind Annahmen – nach dem Gespräch mit dem Inhaber anpassen.
*/
(function(){
  var TABLES=[
    {id:'T1',name:'Tisch 1',seats:2},{id:'T2',name:'Tisch 2',seats:2},
    {id:'T3',name:'Tisch 3',seats:4},{id:'T4',name:'Tisch 4',seats:4},{id:'T5',name:'Tisch 5',seats:4},
    {id:'T6',name:'Tisch 6',seats:6},{id:'T7',name:'Tisch 7',seats:6},
    {id:'T8',name:'Tisch 8',seats:8},{id:'T9',name:'Stammtisch',seats:10},{id:'T10',name:'Nebenraum',seats:20}
  ];
  /* Echte Öffnungszeiten (Minuten ab 0 Uhr), reservierbar bis Mitternacht. 0 = Sonntag */
  var OPEN={0:[[600,900],[1020,1440]],1:[],2:[],3:[[960,1440]],4:[[960,1440]],5:[[960,1440]],6:[[900,1440]]};
  var DAYS=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  var DS=['So','Mo','Di','Mi','Do','Fr','Sa'];
  var MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  var SRC={web:'Website',phone:'Telefon',walkin:'Vor Ort'};
  var KEY='brauhaus-reservierungen-demo-v1';

  function pad(n){return String(n).padStart(2,'0')}
  function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function parse(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
  function addDays(s,n){var d=parse(s);d.setDate(d.getDate()+n);return ymd(d)}
  function toMin(t){var p=t.split(':').map(Number);return p[0]*60+p[1]}
  function fmt(m){return pad(Math.floor(m/60)%24)+':'+pad(m%60)}
  function todayStr(){return ymd(new Date())}
  function nowMin(){var n=new Date();return n.getHours()*60+n.getMinutes()}
  function open(date){return OPEN[parse(date).getDay()]}
  function isClosed(date){return open(date).length===0}
  function slots(date){var r=[];open(date).forEach(function(iv){for(var m=iv[0];m<=iv[1]-90;m+=30)r.push(m)});return r}
  function uid(){return Math.random().toString(36).slice(2,10)}
  function active(r){return r.status!=='cancelled'}

  function isFree(data,tid,date,start,dur,ignore){
    return !data.some(function(r){
      if(r.id===ignore||r.table!==tid||r.date!==date||!active(r))return false;
      var s=toMin(r.start),e=s+r.dur;return start<e&&s<start+dur});
  }
  function fitting(data,date,start,dur,persons,ignore){
    return TABLES.filter(function(t){return t.seats>=persons&&isFree(data,t.id,date,start,dur,ignore)})
                 .sort(function(a,b){return a.seats-b.seats});
  }

  function save(data){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}}
  function load(){try{var s=localStorage.getItem(KEY);if(s)return JSON.parse(s)}catch(e){}return null}

  /* ---------- Beispieldaten (erfunden) ---------- */
  var FIRST=['Anna','Thomas','Sabine','Michael','Julia','Stefan','Petra','Markus','Laura','Jens','Claudia','Daniel','Nicole','Frank','Lisa','Andreas'];
  var LAST=['Schmitz','Müller','Becker','Hoffmann','Wagner','Schäfer','Koch','Klein','Weber','Krämer','Jansen','Lorenz','Hermanns','Peters','Esser','Dahmen'];
  var NOTES=['','','','','','Kinderstuhl','Geburtstag 🎂','Hund dabei','Fensterplatz','Rollstuhl','Vegetarisch'];
  function rng(seed){var h=2166136261;for(var i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619)}
    return function(){h+=0x6D2B79F5;var t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  function pick(r,a){return a[Math.floor(r()*a.length)]}
  function seed(){
    var data=[], t=todayStr();
    function count(date){return data.filter(function(r){return r.date===date}).length}
    for(var i=-1;i<14;i++){
      var date=addDays(t,i);if(isClosed(date))continue;
      var r=rng(date), wd=parse(date).getDay();
      var n={0:10,3:5,4:6,5:10,6:12}[wd]||6;
      var sl=slots(date);
      for(var k=0;k<n*2&&count(date)<n;k++){
        var weighted=[];sl.forEach(function(m){var w=(m>=1080&&m<=1230)?5:2;if(m<900)w=3;for(var j=0;j<w;j++)weighted.push(m)});
        var start=pick(r,weighted);
        var persons=pick(r,[2,2,2,2,3,4,4,4,4,5,6,6,8,10]);
        var dur=persons>=8?180:pick(r,[90,120,120,150]);
        var f=fitting(data,date,start,dur,persons);if(!f.length)continue;
        var x=r(), src=x<.35?'web':(x<.85?'phone':'walkin');
        var name=persons>=6&&r()<.5?('Familie '+pick(r,LAST)):(pick(r,FIRST)+' '+pick(r,LAST));
        var note=persons>=10?'Stammtisch':pick(r,NOTES);
        data.push({id:uid(),date:date,start:fmt(start),dur:dur,name:name,phone:'0'+(2421+Math.floor(r()*9))+' '+Math.floor(100000+r()*899999),
          persons:persons,table:f[0].id,source:src,note:note,status:'confirmed'});
      }
    }
    data.forEach(function(r){var end=toMin(r.start)+r.dur;if(r.date<t||(r.date===t&&end<nowMin()))r.status='arrived'});
    save(data);
    return data;
  }
  function loadOrSeed(){return load()||seed()}

  window.RES={TABLES:TABLES,OPEN:OPEN,DAYS:DAYS,DS:DS,MONTHS:MONTHS,SRC:SRC,KEY:KEY,FIRST:FIRST,LAST:LAST,
    pad:pad,ymd:ymd,parse:parse,addDays:addDays,toMin:toMin,fmt:fmt,todayStr:todayStr,nowMin:nowMin,
    open:open,isClosed:isClosed,slots:slots,uid:uid,active:active,isFree:isFree,fitting:fitting,
    save:save,load:load,seed:seed,loadOrSeed:loadOrSeed};
})();
