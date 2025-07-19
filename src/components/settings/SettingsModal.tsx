import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Bot, 
  Palette, 
  Type, 
  Volume2, 
  VolumeX,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Briefcase,
  User
} from 'lucide-react';
import type { ChatSettings } from '@/types/chat';
import { colorSchemes } from '@/utils/chatUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onUpdateSettings: (settings: ChatSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onUpdateSettings }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<ChatSettings>(settings);

  const handleSave = () => {
    onUpdateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(settings);
  };

  const updateLocalSettings = (updates: Partial<ChatSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...updates }));
  };

  const creativityLabels: Record<number, string> = {
    0.1: 'Muito Conservativa',
    0.3: 'Conservativa',
    0.5: 'Equilibrada',
    0.7: 'Criativa',
    0.9: 'Muito Criativa'
  };

  const getCurrentCreativityLabel = () => {
    const value = localSettings.creativity;
    const closest = Object.keys(creativityLabels).reduce((prev, curr) => 
      Math.abs(parseFloat(curr) - value) < Math.abs(parseFloat(prev) - value) ? curr : prev
    );
    return creativityLabels[parseFloat(closest)];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Sistema
          </DialogTitle>
          <DialogDescription>
            Personalize sua experiência de chat com a IA
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai" className="flex items-center gap-1">
              <Bot className="h-4 w-4" />
              IA
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Geral
            </TabsTrigger>
          </TabsList>

          {/* IA Settings */}
          <TabsContent value="ai" className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="personality" className="text-sm font-medium">
                  Personalidade da IA
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Defina como a IA deve se comportar e responder
                </p>
                <Textarea
                  id="personality"
                  value={localSettings.aiPersonality}
                  onChange={(e) => updateLocalSettings({ aiPersonality: e.target.value })}
                  className="min-h-[100px]"
                  placeholder="Descreva como a IA deve se comportar..."
                />
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">
                  Criatividade: {getCurrentCreativityLabel()}
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Controla o quão criativa e variada serão as respostas
                </p>
                <div className="px-2">
                  <Slider
                    value={[localSettings.creativity]}
                    onValueChange={([value]) => updateLocalSettings({ creativity: value })}
                    max={1}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Conservativa</span>
                    <span>Criativa</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Modo Formal</Label>
                  <p className="text-xs text-muted-foreground">
                    Ativa linguagem mais formal e profissional
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {localSettings.formalMode ? (
                    <Badge variant="secondary" className="text-xs">
                      <Briefcase className="h-3 w-3 mr-1" />
                      Formal
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <User className="h-3 w-3 mr-1" />
                      Casual
                    </Badge>
                  )}
                  <Switch
                    checked={localSettings.formalMode}
                    onCheckedChange={(checked) => updateLocalSettings({ formalMode: checked })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Tema</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Escolha entre modo claro, escuro ou automático
                </p>
                <Select
                  value={localSettings.theme}
                  onValueChange={(value: 'light' | 'dark' | 'system') => 
                    updateLocalSettings({ theme: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Claro
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Escuro
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Automático
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Esquema de Cores</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Personalize as cores da interface
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(colorSchemes).map(([key, scheme]) => (
                    <button
                      key={key}
                      onClick={() => updateLocalSettings({ colorScheme: key as any })}
                      className={`p-3 rounded-lg border transition-all ${
                        localSettings.colorScheme === key
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: `hsl(${scheme.primary})` }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: `hsl(${scheme.accent})` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{scheme.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Tamanho da Fonte</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Ajuste o tamanho do texto para melhor legibilidade
                </p>
                <Select
                  value={localSettings.fontSize}
                  onValueChange={(value: 'small' | 'medium' | 'large') => 
                    updateLocalSettings({ fontSize: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">
                      <div className="flex items-center gap-2">
                        <Type className="h-3 w-3" />
                        Pequeno
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        Médio
                      </div>
                    </SelectItem>
                    <SelectItem value="large">
                      <div className="flex items-center gap-2">
                        <Type className="h-5 w-5" />
                        Grande
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Som das Notificações</Label>
                  <p className="text-xs text-muted-foreground">
                    Reproduz som quando a IA responde
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {localSettings.soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-primary" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    checked={localSettings.soundEnabled}
                    onCheckedChange={(checked) => updateLocalSettings({ soundEnabled: checked })}
                  />
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  Atalhos do Teclado
                </h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Nova conversa</span>
                    <Badge variant="outline" className="text-xs">Ctrl + N</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Buscar</span>
                    <Badge variant="outline" className="text-xs">Ctrl + F</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Configurações</span>
                    <Badge variant="outline" className="text-xs">Ctrl + ,</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Fechar modal</span>
                    <Badge variant="outline" className="text-xs">Esc</Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset}>
            Redefinir
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Configurações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}