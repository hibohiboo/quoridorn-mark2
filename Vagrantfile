$ansible_install = <<SHELL
  if ! type venv > /dev/null 2>&1; then
    # rootユーザとして実行されるためsudo不要
    apt-get -y update
    apt-get -y install curl
    # apt をスクリプトで使うと警告が出る。 https://codeday.me/jp/qa/20190808/1404436.html
    apt-get install -y python3-venv python3-pip

    # vagrantユーザとしてvirtualenvとansibleをインストール
    su -c "source /vagrant/virtual-environment/provision/bash/install_ansible.sh" vagrant
  fi
SHELL


# virtual machine設定
Vagrant.configure(2) do |config|
  config.vm.box = "bento/ubuntu-18.04"
  config.vm.network "private_network", ip: "192.168.74.60"

  config.vm.provider "virtualbox" do |vm|
    vm.memory = 4096
    vm.linked_clone = true
    vm.customize [ "modifyvm", :id, "--cpus", "2", "--ioapic", "on"]
  end
  config.vm.provision "shell", inline: $ansible_install
  config.vm.provision "shell", inline: <<-SHELL
    timedatectl set-timezone Asia/Tokyo
    source /home/vagrant/venv3/bin/activate
    # provision 実行
    # 失敗した場合は vagrant up後に vagrant provision
    # それでも失敗した場合は、windows再起動後にもう一度vagrant up vagrant provision
    ANSIBLE_CONFIG=/vagrant/virtual-environment/provision/.ansible.cfg ansible-playbook -i /vagrant/virtual-environment/provision/playbooks/inventory/hosts /vagrant/virtual-environment/provision/playbooks/site.yml -c local -v
  SHELL
  config.vm.provision "shell", run: "always", inline: 'su -c "source /vagrant/virtual-environment/provision/bash/docker_up.sh" vagrant'
end
