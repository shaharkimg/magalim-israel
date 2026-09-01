#!/usr/bin/perl
use strict; use warnings;
binmode(STDOUT, ":encoding(UTF-8)");
binmode(STDIN, ":encoding(UTF-8)");
use utf8;

sub html_decode {
  my $s = shift;
  $s =~ s/&#039;/'/g; $s =~ s/&#39;/'/g; $s =~ s/&quot;/"/g;
  $s =~ s/&amp;/&/g; $s =~ s/&nbsp;/ /g;
  return $s;
}
sub sql_escape { my $s = html_decode(shift); $s =~ s/'/''/g; return $s; }

sub category_for {
  my ($name) = @_;
  return "reserves" if $name =~ /שמורת|שמורה/;
  return "water" if $name =~ /נחל|מפל|מעיין|מעיינות|בריכ/;
  return "mountains" if $name =~ /הר |רכס|מכתש|פסגת|גבעת|^הר/;
  return "viewpoints" if $name =~ /מצפה|תצפית/;
  return "archaeology" if $name =~ /עתיק|חורבת|תל |מערת|מערה|נבטית/;
  return "heritage" if $name =~ /מבצר|מצודת/;
  return "parks" if $name =~ /פארק לאומי|גן לאומי/;
  return "nature";
}

my %cat_label = (
  reserves=>"בשמורת טבע", water=>"לאורך נחל ומקווי מים", mountains=>"במסלול הררי",
  viewpoints=>"אל נקודת תצפית", archaeology=>"באתר ארכיאולוגי", heritage=>"באתר מורשת",
  parks=>"בפארק לאומי", nature=>"בטבע פתוח",
);

my %region_label = ( north=>"בצפון הארץ", center=>"במרכז הארץ", jerusalem=>"בהרי ירושלים",
  south=>"בנגב ובדרום הארץ", deadsea=>"באזור ים המלח ומדבר יהודה", eilat=>"באזור אילת" );

my %diff_map = ( "קל"=>["easy",10], "בינוני"=>["medium",25], "קשה"=>["hard",50], "מאתגר"=>["extreme",100] );

my @templates = (
  'מסלול טיול %s, %s, באורך כ-%s ק"מ ברמת קושי %s.',
  'טיול %s %s, באורך של כ-%s ק"מ ברמת קושי %s.',
  'יעד טיול %s %s — מסלול באורך כ-%s ק"מ, רמת קושי %s.',
);

my $i = 0;
while (my $line = <STDIN>) {
  chomp $line;
  my ($id, $name, $diff, $dist, $listsub, $coord, $topregion, $breadsub) = split /\|/, $line, 8;
  next unless $coord && $coord =~ /^([0-9.]+),([0-9.]+)$/;
  my ($lat, $lon) = ($1, $2);

  my $region;
  my $subtext = ($breadsub // "") . " " . ($listsub // "");
  if ($subtext =~ /ים המלח/) { $region = "deadsea"; }
  elsif ($subtext =~ /אילת/) { $region = "eilat"; }
  elsif (($topregion//"") eq "ירושלים והסביבה") { $region = "jerusalem"; }
  elsif (($topregion//"") eq "צפון") { $region = "north"; }
  elsif (($topregion//"") eq "מרכז") { $region = "center"; }
  elsif (($topregion//"") eq "דרום") { $region = "south"; }
  else { next; }

  my $diffkey = $diff && $diff_map{$diff} ? $diff : "בינוני";
  my ($diffid, $points) = @{$diff_map{$diffkey}};
  my $diffword = $diffkey eq "קל" ? "קלה" : $diffkey eq "בינוני" ? "בינונית" : $diffkey eq "קשה" ? "קשה" : "מאתגרת";

  my $distnum = ($dist && $dist =~ /^[0-9.]+$/) ? $dist : "3";
  my $hours = $distnum / 3.2;
  $hours = 0.5 if $hours < 0.5;
  my $hourstext = $hours < 1 ? "כחצי שעה" : $hours <= 1.4 ? "כשעה" : sprintf("כ-%d שעות", int($hours+0.5));

  my $cat = category_for($name);
  my $tmpl = $templates[$id % scalar(@templates)];
  my $desc = sprintf($tmpl, $cat_label{$cat}, $region_label{$region}, $distnum, $diffword);

  my $baseVisits = 300 + ($id % 47) * 61;

  printf("('tiuli-%s','%s','%s','%s','%s','%s',%s,%s,'%s',%s,%s,%s),\n",
    $id, sql_escape($name), sql_escape($desc), $cat, $diffid, $region,
    $lat, $lon, sql_escape($hourstext), $distnum, $points, $baseVisits);
  $i++;
}
print STDERR "TOTAL: $i\n";
